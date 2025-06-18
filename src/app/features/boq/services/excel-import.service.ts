import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface ExcelSheet {
  name: string;
  rowCount: number;
  preview: any[][];
}

export interface BOQImportRow {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  specification?: string;
  supplier?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelImportService {
  
  async readExcelFile(file: File): Promise<ExcelSheet[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          const sheets: ExcelSheet[] = workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            return {
              name: sheetName,
              rowCount: jsonData.length,
              preview: jsonData.slice(0, 10) as any[][]
            };
          });
          
          resolve(sheets);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }
  
  async parseSheetForBOQ(file: File, sheetName: string): Promise<BOQImportRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            reject(new Error(`Sheet "${sheetName}" not found`));
            return;
          }
          
          // Get all rows as array of arrays
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Find header row (contains "Item Code" or similar)
          let headerIndex = -1;
          let headers: string[] = [];
          
          for (let i = 0; i < Math.min(10, rows.length); i++) {
            const row = rows[i];
            if (row && row.some(cell => 
              typeof cell === 'string' && 
              (cell.includes('Item Code') || cell.includes('Description'))
            )) {
              headerIndex = i;
              headers = row.map(h => String(h || '').trim());
              break;
            }
          }
          
          if (headerIndex === -1) {
            reject(new Error('Could not find header row with Item Code or Description'));
            return;
          }
          
          // Map column indices
          const columnMap = this.mapColumns(headers);
          console.log('Column mapping:', columnMap);
          console.log('Headers:', headers);
          
          // Parse data rows
          const boqItems: BOQImportRow[] = [];
          
          for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            // Get raw values first
            const itemCode = this.getCellValue(row, columnMap.itemCode);
            const description = this.getCellValue(row, columnMap.description);
            
            // Skip rows without item code or description
            if (!itemCode && !description) continue;
            
            // Get raw values for quantity and price (might be numbers, not strings)
            const quantityRaw = columnMap.quantity >= 0 ? row[columnMap.quantity] : undefined;
            const priceRaw = columnMap.price >= 0 ? row[columnMap.price] : undefined;
            
            // Skip category headers (no quantity, no price)
            if (!itemCode && description && !quantityRaw && !priceRaw) {
              console.log(`Skipping category row: ${description}`);
              continue;
            }
            
            const item: BOQImportRow = {
              itemCode: itemCode || `ITEM-${boqItems.length + 1}`,
              description: description || '',
              unit: this.getCellValue(row, columnMap.unit) || 'Each',
              quantity: this.parseNumber(quantityRaw),
              unitPrice: this.parsePrice(priceRaw),
              specification: this.getCellValue(row, columnMap.specification),
              supplier: this.getCellValue(row, columnMap.supplier)
            };
            
            boqItems.push(item);
          }
          
          console.log(`Parsed ${boqItems.length} valid BOQ items from ${rows.length - headerIndex - 1} data rows`);
          resolve(boqItems);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  }
  
  private mapColumns(headers: string[]): any {
    const map: any = {
      itemCode: -1,
      description: -1,
      unit: -1,
      quantity: -1,
      price: -1,
      specification: -1,
      supplier: -1
    };
    
    headers.forEach((header, index) => {
      const h = header.toLowerCase();
      
      // Item Code
      if (h.includes('item code') || h === 'code' || h.includes('product code')) {
        map.itemCode = index;
      }
      // Description
      else if (h.includes('description') || h === 'desc' || h.includes('item name')) {
        map.description = index;
      }
      // Unit
      else if (h === 'uom' || h === 'unit' || h.includes('unit of measure')) {
        map.unit = index;
      }
      // Quantity
      else if (h.includes('quantity') || h === 'qty' || h.includes('amount')) {
        map.quantity = index;
      }
      // Price - prioritize "item rate" or "unit price" over "total cost"
      else if (h.includes('item rate') || h.includes('unit price') || h.includes('unit cost')) {
        map.price = index;
      }
      // Only use generic 'price' or 'rate' if more specific terms not found
      else if (map.price === -1 && (h === 'price' || h === 'rate' || h.includes('price per'))) {
        map.price = index;
      }
      // Specification
      else if (h.includes('spec') || h.includes('category') || h.includes('type')) {
        map.specification = index;
      }
      // Supplier
      else if (h.includes('supplier') || h.includes('vendor') || h.includes('manufacturer')) {
        map.supplier = index;
      }
    });
    
    return map;
  }
  
  private getCellValue(row: any[], index: number): string {
    if (index < 0 || index >= row.length) return '';
    const value = row[index];
    // Handle undefined, null, or empty values
    if (value === undefined || value === null || value === '') return '';
    return String(value).trim();
  }
  
  private parseNumber(value: string | number | undefined): number {
    // Handle direct numbers from Excel
    if (typeof value === 'number') return value;
    
    // Handle string values
    if (!value || value === '') return 0;
    
    // Remove commas and parse
    const cleaned = String(value).replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }
  
  private parsePrice(value: string | number | undefined): number {
    // Handle direct numbers from Excel (Excel might parse "113.25" as number)
    if (typeof value === 'number') return value;
    
    // Handle string values
    if (!value || value === '') return 0;
    
    // Remove currency symbols, spaces, and commas
    const cleaned = String(value).replace(/[R$£€\s,]/g, '');
    return parseFloat(cleaned) || 0;
  }
}