import { Observable, from, map, of, throwError } from 'rxjs';
import { PoleDataSource, PoleDataFilters } from './pole-data-source.interface';
import { PoleRecord } from '../../models/pole-record.model';
import { DataSourceMetadata, CsvParseOptions } from '../../models/data-source-config.model';

/**
 * CSV implementation of PoleDataSource
 * Processes OneMap CSV files with pole permission data
 */
export class CsvPoleDataSource implements PoleDataSource {
  private records: PoleRecord[] = [];
  private metadata: DataSourceMetadata;
  private fileContent: string = '';

  constructor(
    private file: File,
    private options: CsvParseOptions = {},
  ) {
    this.metadata = {
      type: 'csv',
      name: file.name,
      description: `CSV file: ${file.name}`,
      fileSize: file.size,
      lastUpdated: new Date(file.lastModified),
    };

    // Set default options
    this.options = {
      delimiter: ',',
      encoding: 'utf-8',
      skipEmptyLines: true,
      trimHeaders: true,
      trimValues: true,
      ...options,
    };
  }

  getRecords(filters?: PoleDataFilters): Observable<PoleRecord[]> {
    if (this.records.length > 0) {
      return of(this.applyFilters(this.records, filters));
    }

    return from(this.parseFile()).pipe(
      map((records) => {
        this.records = records;
        return this.applyFilters(records, filters);
      }),
    );
  }

  validateConnection(): Observable<boolean> {
    if (!this.file) {
      return of(false);
    }

    // Validate file type
    const validTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
    const isValidType =
      validTypes.includes(this.file.type) || this.file.name.toLowerCase().endsWith('.csv');

    return of(isValidType);
  }

  getMetadata(): Observable<DataSourceMetadata> {
    if (this.metadata.recordCount !== undefined) {
      return of(this.metadata);
    }

    return from(this.parseFile()).pipe(
      map((records) => {
        this.metadata.recordCount = records.length;
        this.metadata.columns = this.extractColumns(records);
        return this.metadata;
      }),
    );
  }

  dispose(): void {
    this.records = [];
    this.fileContent = '';
  }

  /**
   * Parses the CSV file and returns pole records
   */
  private async parseFile(): Promise<PoleRecord[]> {
    if (this.fileContent) {
      return this.parseCsvContent(this.fileContent);
    }

    try {
      // Read file with proper encoding handling
      this.fileContent = await this.readFileWithEncoding();
      return this.parseCsvContent(this.fileContent);
    } catch (error) {
      console.error('Error parsing CSV file:', error);
      throw new Error(
        `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Reads file with fallback encoding support
   */
  private async readFileWithEncoding(): Promise<string> {
    // Try UTF-8 first
    try {
      return await this.file.text();
    } catch {
      // Fallback to Windows-1252 encoding
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(this.file, 'windows-1252');
      });
    }
  }

  /**
   * Parses CSV content into pole records
   */
  private parseCsvContent(content: string): PoleRecord[] {
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data');
    }

    // Parse headers
    const headers = this.parseLineValues(lines[0]);
    if (this.options.trimHeaders) {
      headers.forEach((h, i) => (headers[i] = h.trim()));
    }

    // Validate required columns
    this.validateHeaders(headers);

    // Parse data rows
    const records: PoleRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (this.options.skipEmptyLines && !lines[i].trim()) {
        continue;
      }

      const values = this.parseLineValues(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}`);
        continue;
      }

      const record: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        if (this.options.trimValues) {
          value = value.trim();
        }
        record[header] = value;
      });

      records.push(record as PoleRecord);
    }

    return records;
  }

  /**
   * Parses a CSV line into values, handling quoted values
   */
  private parseLineValues(line: string): string[] {
    const delimiter = this.options.delimiter || ',';
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  /**
   * Validates that required headers are present
   */
  private validateHeaders(headers: string[]): void {
    const requiredHeaders = [
      'Property ID',
      '1map NAD ID',
      'Pole Number',
      'Drop Number',
      'Stand Number',
      'Status',
      'Flow Name Groups',
      'Site',
      'Sections',
      'PONs',
      'Location Address',
      'Latitude',
      'Longitude',
      'Field Agent Name (pole permission)',
      'Latitude & Longitude',
      'lst_mod_by',
      'lst_mod_dt',
    ];

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }
  }

  /**
   * Applies filters to pole records
   */
  private applyFilters(records: PoleRecord[], filters?: PoleDataFilters): PoleRecord[] {
    if (!filters) {
      return records;
    }

    return records.filter((record) => {
      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        const recordDate = this.parseDate(record['lst_mod_dt']);
        if (!recordDate) return false;

        if (filters.dateFrom && recordDate < filters.dateFrom) return false;
        if (filters.dateTo && recordDate > filters.dateTo) return false;
      }

      // Status filtering
      if (filters.status && !record['Status'].includes(filters.status)) {
        return false;
      }

      // Flow Name Groups filtering
      if (filters.flowNameGroups && filters.flowNameGroups.length > 0) {
        const hasMatch = filters.flowNameGroups.some((flow) =>
          record['Flow Name Groups'].includes(flow),
        );
        if (!hasMatch) return false;
      }

      // Agent filtering
      if (filters.agents && filters.agents.length > 0) {
        const agentName = record['Field Agent Name (pole permission)'];
        const modBy = record['lst_mod_by'];
        const hasMatch = filters.agents.some(
          (agent) => agentName.includes(agent) || modBy.includes(agent),
        );
        if (!hasMatch) return false;
      }

      // Site filtering
      if (filters.sites && filters.sites.length > 0) {
        const hasMatch = filters.sites.some((site) => record['Site'].includes(site));
        if (!hasMatch) return false;
      }

      // Sections filtering
      if (filters.sections && filters.sections.length > 0) {
        const hasMatch = filters.sections.some((section) => record['Sections'].includes(section));
        if (!hasMatch) return false;
      }

      return true;
    });
  }

  /**
   * Parses various date formats
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Try ISO format first
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Try JavaScript date string format
      if (dateStr.includes('GMT')) {
        return new Date(dateStr);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts column names from records
   */
  private extractColumns(records: PoleRecord[]): string[] {
    if (records.length === 0) return [];
    return Object.keys(records[0]);
  }
}
