import { Injectable } from '@angular/core';
import { OneMapRecord, ProcessedOneMapData } from '../models/onemap.model';

@Injectable({
  providedIn: 'root',
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
    'Last Modified Home Sign Ups Date',
  ];

  private readonly COLUMN_MAPPING: { [key: string]: string } = {
    'Property ID': 'propertyId',
    '1map NAD ID': 'oneMapNadId',
    'Pole Number': 'poleNumber',
    'Drop Number': 'dropNumber',
    Status: 'status',
    'Flow Name Groups': 'flowNameGroups',
    Sections: 'sections',
    PONs: 'pons',
    Location: 'location',
    Address: 'address',
    'Field Agent Name (Home Sign Ups)': 'fieldAgentName',
    'Last Modified Home Sign Ups By': 'lastModifiedBy',
    'Last Modified Home Sign Ups Date': 'lastModifiedDate',
  };

  validateCsvHeaders(headers: string[]): { valid: boolean; missingColumns: string[] } {
    const missingColumns: string[] = [];

    // Check for required columns (some might have slight variations)
    this.REQUIRED_COLUMNS.forEach((required) => {
      const found = headers.some((header) => {
        const normalizedHeader = header.trim().toLowerCase();
        const normalizedRequired = required.toLowerCase();

        // Direct match
        if (normalizedHeader === normalizedRequired) return true;

        // Contains match
        if (normalizedHeader.includes(normalizedRequired)) return true;

        // Special cases
        if (required === 'Location Address' && normalizedHeader.includes('location')) return true;

        return false;
      });

      if (!found) {
        missingColumns.push(required);
      }
    });

    return {
      valid: missingColumns.length === 0,
      missingColumns,
    };
  }

  parseCsvData(csvContent: string): OneMapRecord[] {
    const lines = csvContent.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const records: OneMapRecord[] = [];

    // Create column index mapping
    const columnIndices: { [key: string]: number } = {};
    headers.forEach((header, index) => {
      Object.keys(this.COLUMN_MAPPING).forEach((key) => {
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
        lastModifiedDate: values[columnIndices['lastModifiedDate']] || '',
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
    // Step 1: Initial Data Filtering
    // Filter records where Status = "Home Sign Ups: Approved & Installation Scheduled"
    // Exclude records where Status contains "Pole Permissions"
    const filteredRecords = records.filter(
      (record) =>
        record.status === 'Home Sign Ups: Approved & Installation Scheduled' &&
        !record.status.includes('Pole Permissions'),
    );

    // Step 2: Data Quality Control
    // 2a. Handle Missing Drop Numbers
    // Identify and move ALL rows without a Drop Number to "No_Drop_Allocated"
    const noDropAllocated = filteredRecords.filter(
      (record) => !record.dropNumber || record.dropNumber.trim() === '',
    );
    const recordsWithDrops = filteredRecords.filter(
      (record) => record.dropNumber && record.dropNumber.trim() !== '',
    );

    // 2b. Handle Duplicate Drop Numbers
    // For rows with duplicate Drop Numbers, compare "Last Modified Home Sign Ups Date"
    // Keep only the row with the earliest date for each Drop Number
    // Move newer duplicates to "Duplicate_Drops_Removed"
    const dropNumberMap = new Map<string, OneMapRecord[]>();
    const duplicateDropsRemoved: OneMapRecord[] = [];

    // Group records by drop number
    recordsWithDrops.forEach((record) => {
      const dropNumber = record.dropNumber.trim();
      if (!dropNumberMap.has(dropNumber)) {
        dropNumberMap.set(dropNumber, []);
      }
      dropNumberMap.get(dropNumber)!.push(record);
    });

    // Keep earliest record for each drop number, move duplicates to removed list
    const cleanRecords: OneMapRecord[] = [];
    dropNumberMap.forEach((recordsForDrop, dropNumber) => {
      if (recordsForDrop.length === 1) {
        // No duplicates, keep the record
        cleanRecords.push(recordsForDrop[0]);
      } else {
        // Multiple records for same drop number
        // Sort by "Last Modified Home Sign Ups Date" and keep earliest
        const sorted = recordsForDrop.sort((a, b) => {
          const dateA = this.parseDate(a.lastModifiedDate);
          const dateB = this.parseDate(b.lastModifiedDate);
          return dateA.getTime() - dateB.getTime();
        });

        // Keep the earliest (first in sorted array)
        cleanRecords.push(sorted[0]);
        // Move newer duplicates to removed list
        duplicateDropsRemoved.push(...sorted.slice(1));
      }
    });

    // Step 3: First Approval Date Analysis
    // From the remaining clean data, for each unique Drop Number,
    // identify the earliest "Last Modified Home Sign Ups Date"
    // This becomes the "first approval date" for that Drop
    const dropFirstApprovalMap = new Map<string, Date>();
    cleanRecords.forEach((record) => {
      const date = this.parseDate(record.lastModifiedDate);
      const dropNumber = record.dropNumber.trim();
      const existing = dropFirstApprovalMap.get(dropNumber);
      if (!existing || date < existing) {
        dropFirstApprovalMap.set(dropNumber, date);
      }
    });

    // Step 4: Date-Based Sheet Creation
    // Create two main sheets based on first approval date
    const firstEntryRecords: OneMapRecord[] = [];
    const duplicatesPreWindow: OneMapRecord[] = [];

    // Get all records for each drop and categorize based on first approval date
    const allRecordsForAnalysis = [...cleanRecords];

    allRecordsForAnalysis.forEach((record) => {
      const dropNumber = record.dropNumber.trim();
      const firstApprovalDate = dropFirstApprovalMap.get(dropNumber);

      if (firstApprovalDate) {
        if (firstApprovalDate >= startDate && firstApprovalDate <= endDate) {
          // Sheet 1: "FirstEntry_StartDate-EndDate"
          // Include ALL rows for Drops whose first approval date falls within the date range
          firstEntryRecords.push(record);
        } else if (firstApprovalDate < startDate) {
          // Sheet 2: "Duplicates_PreWindow"
          // Include ALL rows for Drops whose first approval date is before StartDate
          duplicatesPreWindow.push(record);
        }
      }
    });

    return {
      firstEntryRecords,
      duplicatesPreWindow,
      noDropAllocated,
      duplicateDropsRemoved,
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

    // Create CSV header in exact order specified
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
      'Last Modified Home Sign Ups Date',
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...records.map((record) =>
        [
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
          this.escapeCsvValue(record.lastModifiedDate),
        ].join(','),
      ),
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
