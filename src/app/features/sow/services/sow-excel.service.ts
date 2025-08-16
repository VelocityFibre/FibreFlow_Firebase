import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { 
  ExcelParseResult, 
  PoleImportData, 
  DropImportData, 
  FibreImportData,
  ExcelParseError 
} from '../models/sow-import.model';

@Injectable({
  providedIn: 'root'
})
export class SOWExcelService {

  /**
   * Parse uploaded Excel file for SOW data
   */
  parseExcelFile(file: File): Observable<ExcelParseResult> {
    return from(this.processExcelFile(file)).pipe(
      map(result => result),
      catchError(error => {
        console.error('Excel parsing error:', error);
        return throwError(() => new Error(`Excel parsing failed: ${error.message}`));
      })
    );
  }

  private async processExcelFile(file: File): Promise<ExcelParseResult> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      console.log(`Processing Excel file: ${file.name}`);
      console.log(`Found sheets: ${workbook.SheetNames.join(', ')}`);
      
      const result: ExcelParseResult = {
        poles: [],
        drops: [],
        fibre: [],
        errors: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          sheets: workbook.SheetNames
        }
      };

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '' 
        }) as any[][];

        console.log(`\nProcessing sheet: "${sheetName}" with ${data.length} rows`);
        await this.processSheet(sheetName, data, result);
      }

      // If no poles were found but drops have pole references, extract poles from drops
      if (result.poles.length === 0 && result.drops.length > 0) {
        console.log('No poles found in data, extracting from drop references...');
        this.extractPolesFromDrops(result);
      }

      result.summary.totalRows = result.poles.length + result.drops.length + result.fibre.length;
      result.summary.errorRows = result.errors.length;
      result.summary.validRows = result.summary.totalRows - result.summary.errorRows;
      
      console.log(`\nFinal results: ${result.poles.length} poles, ${result.drops.length} drops, ${result.fibre.length} fibre segments`);

      return result;
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error}`);
    }
  }

  private async processSheet(sheetName: string, data: any[][], result: ExcelParseResult): Promise<void> {
    if (data.length === 0) return;

    const headers = data[0]?.map(h => String(h).toLowerCase().trim()) || [];
    
    // Determine sheet type based on headers
    const sheetType = this.detectSheetType(headers);
    
    console.log(`Processing sheet "${sheetName}" as type: ${sheetType}`);
    console.log(`Headers found:`, headers.slice(0, 10), '...'); // Show first 10 headers
    
    // Process data rows (skip header)
    let processedCount = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (this.isEmptyRow(row)) continue;

      try {
        switch (sheetType) {
          case 'poles':
            const pole = this.parsePoleRow(headers, row, i);
            if (pole) {
              result.poles.push(pole);
              processedCount++;
            }
            break;
          case 'drops':
            const drop = this.parseDropRow(headers, row, i);
            if (drop) {
              result.drops.push(drop);
              processedCount++;
            }
            break;
          case 'fibre':
            const fibre = this.parseFibreRow(headers, row, i);
            if (fibre) {
              result.fibre.push(fibre);
              processedCount++;
            }
            break;
          default:
            // Only log first few unknown sheet errors to avoid spam
            if (result.errors.length < 5) {
              result.errors.push({
                row: i + 1,
                sheet: sheetName,
                error: `Unknown sheet type. Headers: ${headers.slice(0, 5).join(', ')}...`,
                data: row.slice(0, 5) // Only store first 5 columns to avoid huge error objects
              });
            }
        }
      } catch (error) {
        // Only log first few errors per sheet to avoid spam
        if (result.errors.length < 10) {
          result.errors.push({
            row: i + 1,
            sheet: sheetName,
            error: error instanceof Error ? error.message : 'Unknown parsing error',
            data: row.slice(0, 5) // Only store first 5 columns
          });
        }
      }
    }
    
    console.log(`Processed ${processedCount} valid rows from sheet "${sheetName}"`);
  }

  private detectSheetType(headers: string[]): 'poles' | 'drops' | 'fibre' | 'unknown' {
    const headerStr = headers.join(' ').toLowerCase();
    const sheetName = headers[0]?.toLowerCase() || '';
    
    console.log(`Detecting sheet type for headers:`, headers.slice(0, 10));
    
    // More specific detection - check for unique combinations first
    
    // Check for fibre/cable FIRST (most specific)
    if (headerStr.includes('cable size') || headerStr.includes('string com') || 
        (headerStr.includes('cable') && headerStr.includes('length')) ||
        headerStr.includes('jdw_exp')) {
      console.log(`Detected as FIBRE sheet`);
      return 'fibre';
    }
    
    // Check for poles - look for specific pole indicators
    // If we have many numeric columns (Lawley format), it's likely poles
    const numericHeaders = headers.filter(h => /^\d+$/.test(h));
    if (numericHeaders.length > 10) {
      console.log(`Detected as POLES sheet (${numericHeaders.length} numeric columns)`);
      return 'poles'; // Lawley poles format has many numeric column headers
    }
    
    // Also check for specific pole indicators
    if (headerStr.includes('label_1') || headerStr.includes('pole plant') || 
        headerStr.includes('hld_pole') || headerStr.includes('pole_number') ||
        (headerStr.includes('pole') && !headerStr.includes('strtfeat'))) {
      console.log(`Detected as POLES sheet (pole indicators found)`);
      return 'poles';
    }
    
    // Check for drops/homes - must have label or drop indicators
    if ((headerStr.includes('strtfeat') || headerStr.includes('endfeat')) || 
        headerStr.includes('label') || headerStr.includes('drop') || 
        headerStr.includes('home') || headerStr.includes('premises')) {
      console.log(`Detected as DROPS sheet`);
      return 'drops';
    }
    
    console.log(`Unable to detect sheet type, marking as UNKNOWN`);
    return 'unknown';
  }

  private parsePoleRow(headers: string[], row: any[], rowIndex: number): PoleImportData | null {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });

    // Log first few rows to understand structure
    if (rowIndex <= 5) {
      console.log(`Pole row ${rowIndex} sample data:`, Object.entries(obj).slice(0, 10));
    }

    // For Lawley Poles format (HLD_Pole sheet)
    // The file has complex structure with many columns, extract what we need
    // Try multiple possible fields for pole number
    const poleNumber = obj.label_1 || obj.label || obj.pole_number || obj['pole number'] || 
                      obj['pole_id'] || obj['pole id'] || obj['pole_no'] || obj['pole no'] || '';
    
    // Skip empty rows or rows without pole numbers
    if (!poleNumber || poleNumber.toString().trim() === '') {
      return null;
    }

    // Extract coordinates - they might be in columns with numeric headers or lat/lon
    let lat = 0, lon = 0;
    
    // Try standard lat/lon fields first
    if (obj.lat || obj.latitude) {
      lat = this.parseNumber(obj.lat || obj.latitude);
    }
    if (obj.lon || obj.lng || obj.longitude) {
      lon = this.parseNumber(obj.lon || obj.lng || obj.longitude);
    }
    
    // If not found, look for numeric columns (Lawley format has coords in numbered columns)
    if (lat === 0 && lon === 0) {
      // Look for columns that might contain coordinates (usually large negative/positive numbers)
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (typeof value === 'number' || (typeof value === 'string' && value.match(/^-?\d+\.?\d*$/))) {
          const numVal = parseFloat(String(value));
          // Latitude in SA is typically negative (-26.x)
          if (numVal < -20 && numVal > -35 && lat === 0) {
            lat = numVal;
          }
          // Longitude in SA is typically positive (28.x)
          else if (numVal > 20 && numVal < 35 && lon === 0) {
            lon = numVal;
          }
        }
      });
    }

    return {
      label_1: poleNumber,
      status: obj.status || obj.stat || 'Unknown',
      latitude: lat,
      longitude: lon,
      pon_no: obj.pon_no || obj.pon || '',
      zone_no: obj.zone_no || obj.zone || '',
      created_date: obj.created_date || obj.date_created || obj.date || new Date().toISOString()
    };
  }

  private parseDropRow(headers: string[], row: any[], rowIndex: number): DropImportData | null {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });

    // For Lawley Drops format (HLD_Home sheet)
    // Columns: label, type, subtyp, spec, dim1, dim2, strtfeat, endfeat, cblcpty, conntr, ntwrkptn, cmpownr
    const dropId = obj.label || obj.drop_number || obj.drop_id || obj.id || '';
    
    // Skip empty rows
    if (!dropId || dropId.toString().trim() === '') {
      return null;
    }

    // Log what we found to understand the data better (first 5 rows)
    if (rowIndex <= 5) {
      console.log(`Drop row ${rowIndex} data:`, {
        label: obj.label,
        type: obj.type,
        subtyp: obj.subtyp,
        spec: obj.spec,
        dim1: obj.dim1,
        dim2: obj.dim2,
        strtfeat: obj.strtfeat,
        endfeat: obj.endfeat,
        cblcpty: obj.cblcpty,
        conntr: obj.conntr,
        ntwrkptn: obj.ntwrkptn,
        cmpownr: obj.cmpownr
      });
    }

    // Extract address - might be in strtfeat or other fields
    let address = '';
    if (obj.strtfeat) {
      address = obj.strtfeat;
    } else if (obj.address || obj.street_address) {
      address = obj.address || obj.street_address;
    }

    // For drops, we need to link to poles - check strtfeat (start feature) which contains the pole
    let poleRef = '';
    if (obj.strtfeat && obj.strtfeat.toString().includes('P.')) {
      poleRef = obj.strtfeat; // This is where the pole reference is in Lawley format
    } else if (obj.endfeat && obj.endfeat.toString().includes('P.')) {
      poleRef = obj.endfeat;
    } else if (obj.pole_number || obj.pole) {
      poleRef = obj.pole_number || obj.pole;
    }

    // Extract coordinates if available
    let lat = 0, lon = 0;
    
    // Look for coordinate columns
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'number' || (typeof value === 'string' && value.match(/^-?\d+\.?\d*$/))) {
        const numVal = parseFloat(String(value));
        // Latitude in SA
        if (numVal < -20 && numVal > -35 && lat === 0) {
          lat = numVal;
        }
        // Longitude in SA
        else if (numVal > 20 && numVal < 35 && lon === 0) {
          lon = numVal;
        }
      }
    });

    // Extract distance from dim2 (contains values like "40m", "50m")
    let distance = 0;
    if (obj.dim2) {
      // Extract numeric value from strings like "40m", "50m"
      const match = String(obj.dim2).match(/(\d+(?:\.\d+)?)/);
      if (match) {
        distance = parseFloat(match[1]);
      }
    } else if (obj.dim1 && !isNaN(parseFloat(String(obj.dim1)))) {
      distance = parseFloat(String(obj.dim1));
    } else if (obj.distance_to_pole || obj.distance) {
      distance = this.parseNumber(obj.distance_to_pole || obj.distance);
    }

    return {
      drop_number: dropId,
      pole_number: poleRef,
      premises_id: obj.premises_id || obj.property_id || '',
      address: address,
      status: obj.type || obj.status || 'Home Sign Up',
      latitude: lat,
      longitude: lon,
      distance_to_pole: distance
    };
  }

  private parseFibreRow(headers: string[], row: any[], rowIndex: number): FibreImportData | null {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });

    // For Fibre format (JDW_Exp sheet)
    // Columns: label, cable size, layer, pon_no, zone_no, length, String Com, Date Comp, Contractor, Complete
    const segmentId = obj.label || obj.segment_id || obj.id || '';
    
    // Skip empty rows
    if (!segmentId || segmentId.toString().trim() === '') {
      return null;
    }

    // Extract cable details
    const cableSize = obj['cable size'] || obj.cable_size || '';
    const fibreType = cableSize ? `${cableSize} Core` : (obj.fibre_type || obj.cable_type || obj.type || 'Unknown');

    // For fibre segments, we need to determine start and end points
    // In the data, this might be embedded in the label or other fields
    let fromPoint = '';
    let toPoint = '';
    
    // Check if label contains route info (e.g., "Exchange-P001" or similar)
    if (segmentId.includes('-')) {
      const parts = segmentId.split('-');
      if (parts.length >= 2) {
        fromPoint = parts[0];
        toPoint = parts[1];
      }
    }
    
    // Fallback to other fields
    if (!fromPoint) {
      fromPoint = obj.from_point || obj.from || obj.start_point || 'Start';
    }
    if (!toPoint) {
      toPoint = obj.to_point || obj.to || obj.end_point || 'End';
    }

    // Extract distance/length
    const distance = this.parseNumber(obj.length || obj.distance || 0);

    // Additional info from the sheet
    const contractor = obj['Contractor'] || obj.contractor || '';
    const completed = obj['Complete'] || obj.complete || '';
    const dateCompleted = obj['Date Comp'] || obj.date_comp || '';

    return {
      segment_id: segmentId,
      from_point: fromPoint,
      to_point: toPoint,
      distance: distance,
      fibre_type: fibreType,
      // Store additional data as custom fields (can be extended in the model if needed)
      contractor: contractor,
      completed: completed,
      date_completed: dateCompleted,
      pon_no: obj.pon_no || '',
      zone_no: obj.zone_no || ''
    } as any; // Using any to allow extra fields for now
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  private isEmptyRow(row: any[]): boolean {
    return !row || row.every(cell => !cell || String(cell).trim() === '');
  }

  /**
   * Generate Excel template for SOW imports
   */
  generateTemplate(): Observable<Blob> {
    return from(this.createTemplate());
  }

  private async createTemplate(): Promise<Blob> {
    const workbook = XLSX.utils.book_new();

    // Poles sheet
    const polesData = [
      ['label_1', 'status', 'latitude', 'longitude', 'pon_no', 'zone_no', 'created_date'],
      ['LAW.P.B001', 'Pole Permission: Approved', -26.123456, 28.123456, 'PON001', 'Zone A', '2025-01-01'],
      ['LAW.P.B002', 'Pole Permission: Approved', -26.123457, 28.123457, 'PON002', 'Zone A', '2025-01-02']
    ];
    const polesSheet = XLSX.utils.aoa_to_sheet(polesData);
    XLSX.utils.book_append_sheet(workbook, polesSheet, 'Poles');

    // Drops sheet
    const dropsData = [
      ['drop_number', 'pole_number', 'premises_id', 'address', 'status', 'latitude', 'longitude', 'distance_to_pole'],
      ['DR001', 'LAW.P.B001', 'PREM001', '123 Main St', 'Home Installation: Installed', -26.123456, 28.123456, 50],
      ['DR002', 'LAW.P.B001', 'PREM002', '125 Main St', 'Home Sign Ups: Approved & Installation Scheduled', -26.123457, 28.123457, 75]
    ];
    const dropsSheet = XLSX.utils.aoa_to_sheet(dropsData);
    XLSX.utils.book_append_sheet(workbook, dropsSheet, 'Drops');

    // Fibre sheet
    const fibreData = [
      ['segment_id', 'from_point', 'to_point', 'distance', 'fibre_type'],
      ['SEG001', 'Exchange', 'LAW.P.B001', 1200, '96 Core'],
      ['SEG002', 'LAW.P.B001', 'LAW.P.B002', 150, '48 Core']
    ];
    const fibreSheet = XLSX.utils.aoa_to_sheet(fibreData);
    XLSX.utils.book_append_sheet(workbook, fibreSheet, 'Fibre');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  }

  /**
   * Export SOW data to Excel
   */
  exportSOW(sowData: any): Observable<Blob> {
    return from(this.createSOWExport(sowData));
  }

  private async createSOWExport(sowData: any): Promise<Blob> {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['SOW Export Summary', ''],
      ['Project ID', sowData.projectId],
      ['Generated Date', new Date().toISOString().split('T')[0]],
      ['Version', sowData.version || 1],
      ['Total Poles', sowData.poles?.length || 0],
      ['Total Drops', sowData.drops?.length || 0],
      ['Total Fibre Distance', sowData.totalDistance || 0],
      ['Estimated Days', sowData.estimatedDays || 0]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Export poles if available
    if (sowData.poles?.length > 0) {
      const polesSheet = XLSX.utils.json_to_sheet(sowData.poles);
      XLSX.utils.book_append_sheet(workbook, polesSheet, 'Poles');
    }

    // Export drops if available
    if (sowData.drops?.length > 0) {
      const dropsSheet = XLSX.utils.json_to_sheet(sowData.drops);
      XLSX.utils.book_append_sheet(workbook, dropsSheet, 'Drops');
    }

    // Export fibre if available
    if (sowData.fibre?.length > 0) {
      const fibreSheet = XLSX.utils.json_to_sheet(sowData.fibre);
      XLSX.utils.book_append_sheet(workbook, fibreSheet, 'Fibre');
    }

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  }

  /**
   * Extract unique poles from drop references when no pole data is available
   */
  private extractPolesFromDrops(result: ExcelParseResult): void {
    const poleMap = new Map<string, PoleImportData>();
    
    // Extract unique pole references from drops
    result.drops.forEach(drop => {
      if (drop.pole_number && !poleMap.has(drop.pole_number)) {
        // Create a basic pole record from the drop reference
        const pole: PoleImportData = {
          label_1: drop.pole_number,
          status: 'Unknown - Extracted from drops',
          latitude: drop.latitude || 0,
          longitude: drop.longitude || 0,
          pon_no: '',
          zone_no: '',
          created_date: new Date().toISOString()
        };
        
        poleMap.set(drop.pole_number, pole);
      }
    });
    
    // Add extracted poles to result
    result.poles = Array.from(poleMap.values());
    console.log(`Extracted ${result.poles.length} unique poles from drop references`);
  }
}