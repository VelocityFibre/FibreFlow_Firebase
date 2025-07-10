import { Injectable } from '@angular/core';
import { OneMapRecord, ProcessedOneMapData } from '../models/onemap.model';

@Injectable({
  providedIn: 'root'
})
export class OneMapService {
  private readonly REQUIRED_COLUMNS = [
    'Property ID',
    '1map NAD ID', 
    'Pole Number',
    'Drop Number',
    'Status',
    'Flow Name Groups',
    'Sections',
    'PONs',
    'Location',
    'Address',
    'Field Agent Name (Home Sign Ups)',
    'Last Modified Home Sign Ups By',
    'Last Modified Home Sign Ups Date'
  ];

  private readonly COLUMN_MAPPING: { [key: string]: string } = {
    'Property ID': 'propertyId',
    '1map NAD ID': 'oneMapNadId',
    'Pole Number': 'poleNumber',
    'Drop Number': 'dropNumber',
    'Status': 'status',
    'Flow Name Groups': 'flowNameGroups',
    'Sections': 'sections',
    'PONs': 'pons',
    'Location': 'location',
    'Location Address': 'address',
    'Address': 'address',
    'Field Agent Name (Home Sign Ups)': 'fieldAgentName',
    'Last Modified Home Sign Ups By': 'lastModifiedBy',
    'Last Modified Home Sign Ups Date': 'lastModifiedDate'
  };

  validateCsvHeaders(headers: string[]): { valid: boolean; missingColumns: string[] } {
    const missingColumns: string[] = [];
    
    // Check for required columns (some might have slight variations)
    this.REQUIRED_COLUMNS.forEach(required => {
      const found = headers.some(header => 
        header.includes(required) || 
        (required === 'Location' && header.includes('Location Address')) ||
        (required === 'Address' && header.includes('Location Address'))
      );
      if (!found) {
        missingColumns.push(required);
      }
    });

    return {
      valid: missingColumns.length === 0,
      missingColumns
    };
  }

  parseCsvData(csvContent: string): OneMapRecord[] {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records: OneMapRecord[] = [];

    // Create column index mapping
    const columnIndices: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      Object.keys(this.COLUMN_MAPPING).forEach(key => {
        if (header.includes(key)) {
          columnIndices[this.COLUMN_MAPPING[key]] = index;
        }
      });
    });

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = this.parseCsvLine(lines[i]);
      
      const record: OneMapRecord = {
        propertyId: values[columnIndices['propertyId']] || '',
        oneMapNadId: values[columnIndices['oneMapNadId']] || '',
        poleNumber: values[columnIndices['poleNumber']] || '',
        dropNumber: values[columnIndices['dropNumber']] || '',
        status: values[columnIndices['status']] || '',
        flowNameGroups: values[columnIndices['flowNameGroups']] || '',
        sections: values[columnIndices['sections']] || '',
        pons: values[columnIndices['pons']] || '',
        location: values[columnIndices['location']] || '',
        address: values[columnIndices['address']] || '',
        fieldAgentName: values[columnIndices['fieldAgentName']] || '',
        lastModifiedBy: values[columnIndices['lastModifiedBy']] || '',
        lastModifiedDate: values[columnIndices['lastModifiedDate']] || ''
      };

      records.push(record);
    }

    return records;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  processData(records: OneMapRecord[], startDate: Date, endDate: Date): ProcessedOneMapData {
    // Step 1: Filter for approved & scheduled records (exclude pole permissions)
    let filteredRecords = records.filter(record => 
      record.status === 'Home Sign Ups: Approved & Installation Scheduled' &&
      !record.status.includes('Pole Permissions')
    );

    // Step 2a: Separate records without drop numbers
    const noDropAllocated = filteredRecords.filter(record => !record.dropNumber);
    filteredRecords = filteredRecords.filter(record => record.dropNumber);

    // Step 2b: Handle duplicate drop numbers
    const dropNumberMap = new Map<string, OneMapRecord[]>();
    const duplicateDropsRemoved: OneMapRecord[] = [];

    filteredRecords.forEach(record => {
      const dropNumber = record.dropNumber;
      if (!dropNumberMap.has(dropNumber)) {
        dropNumberMap.set(dropNumber, []);
      }
      dropNumberMap.get(dropNumber)!.push(record);
    });

    // Keep only earliest record for each drop number
    const uniqueRecords: OneMapRecord[] = [];
    dropNumberMap.forEach((records, dropNumber) => {
      if (records.length === 1) {
        uniqueRecords.push(records[0]);
      } else {
        // Sort by date and keep earliest
        const sorted = records.sort((a, b) => {
          const dateA = this.parseDate(a.lastModifiedDate);
          const dateB = this.parseDate(b.lastModifiedDate);
          return dateA.getTime() - dateB.getTime();
        });
        
        uniqueRecords.push(sorted[0]);
        duplicateDropsRemoved.push(...sorted.slice(1));
      }
    });

    // Step 3: Find first approval date for each drop
    const dropFirstApprovalMap = new Map<string, Date>();
    uniqueRecords.forEach(record => {
      const date = this.parseDate(record.lastModifiedDate);
      const existing = dropFirstApprovalMap.get(record.dropNumber);
      if (!existing || date < existing) {
        dropFirstApprovalMap.set(record.dropNumber, date);
      }
    });

    // Step 4: Separate by date window
    const firstEntryRecords: OneMapRecord[] = [];
    const duplicatesPreWindow: OneMapRecord[] = [];

    uniqueRecords.forEach(record => {
      const firstApprovalDate = dropFirstApprovalMap.get(record.dropNumber);
      if (firstApprovalDate && firstApprovalDate >= startDate && firstApprovalDate <= endDate) {
        firstEntryRecords.push(record);
      } else if (firstApprovalDate && firstApprovalDate < startDate) {
        duplicatesPreWindow.push(record);
      }
    });

    return {
      firstEntryRecords,
      duplicatesPreWindow,
      noDropAllocated,
      duplicateDropsRemoved
    };
  }

  private parseDate(dateString: string): Date {
    if (!dateString) return new Date(0);
    
    // Handle ISO format with timezone
    if (dateString.includes('T')) {
      return new Date(dateString);
    }
    
    // Handle other formats if needed
    return new Date(dateString);
  }

  exportToCsv(records: OneMapRecord[], filename: string): void {
    if (records.length === 0) return;

    // Create CSV header
    const headers = [
      'Property ID',
      '1map NAD ID',
      'Pole Number',
      'Drop Number',
      'Status',
      'Flow Name Groups',
      'Sections',
      'PONs',
      'Location',
      'Address',
      'Field Agent Name (Home Sign Ups)',
      'Last Modified Home Sign Ups By',
      'Last Modified Home Sign Ups Date'
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        this.escapeCsvValue(record.propertyId),
        this.escapeCsvValue(record.oneMapNadId),
        this.escapeCsvValue(record.poleNumber),
        this.escapeCsvValue(record.dropNumber),
        this.escapeCsvValue(record.status),
        this.escapeCsvValue(record.flowNameGroups),
        this.escapeCsvValue(record.sections),
        this.escapeCsvValue(record.pons),
        this.escapeCsvValue(record.location),
        this.escapeCsvValue(record.address),
        this.escapeCsvValue(record.fieldAgentName),
        this.escapeCsvValue(record.lastModifiedBy),
        this.escapeCsvValue(record.lastModifiedDate)
      ].join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // Escape quotes and wrap in quotes if contains comma, newline, or quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    
    return value;
  }
}