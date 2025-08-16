import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import * as XLSX from 'xlsx';
import { NeonService } from './neon.service';

export interface OneMapImportBatch {
  id?: string;
  file_name: string;
  import_date: Date;
  record_count: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_by: string;
}

export interface OneMapStatusChange {
  property_id: string;
  pole_number?: string;
  drop_number?: string;
  status: string;
  status_date: Date;
  zone?: string;
  feeder?: string;
  distribution?: string;
  contractor?: string;
  import_batch_id: string;
  raw_data: any; // Store original Excel row data
}

@Injectable({
  providedIn: 'root'
})
export class OneMapNeonService {
  private neonService = inject(NeonService);

  /**
   * Import OneMap Excel file to Neon database
   */
  async importOneMapExcel(file: File, userId: string): Promise<{ batchId: string; recordCount: number }> {
    try {
      // Create import batch record
      const batch: OneMapImportBatch = {
        file_name: file.name,
        import_date: new Date(),
        record_count: 0,
        status: 'processing',
        created_by: userId
      };

      // Insert batch record
      const batchResult = await this.neonService.query<any>(`
        INSERT INTO onemap_import_batches 
        (file_name, import_date, record_count, status, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [batch.file_name, batch.import_date, batch.record_count, batch.status, batch.created_by]).toPromise();

      const batchId = batchResult?.[0]?.id;
      if (!batchId) throw new Error('Failed to create import batch');

      // Parse Excel file
      const data = await this.parseExcelFile(file);
      const records = this.transformOneMapData(data, batchId);

      // Bulk insert status changes
      if (records.length > 0) {
        await this.bulkInsertStatusChanges(records);
        
        // Update batch with success
        await this.neonService.query(`
          UPDATE onemap_import_batches 
          SET status = 'completed', record_count = $1
          WHERE id = $2
        `, [records.length, batchId]).toPromise();
      }

      return { batchId, recordCount: records.length };
    } catch (error) {
      // Log error and update batch status
      console.error('OneMap import error:', error);
      throw error;
    }
  }

  /**
   * Parse Excel file to JSON
   */
  private parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            header: 1, // Use array format to preserve all columns
            defval: null 
          });
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Transform OneMap Excel data to status change records
   */
  private transformOneMapData(data: any[], batchId: string): OneMapStatusChange[] {
    if (data.length < 2) return []; // Need header row + data
    
    const headers = data[0];
    const records: OneMapStatusChange[] = [];
    
    // Map column names to indices
    const columnMap = new Map<string, number>();
    headers.forEach((header: string, index: number) => {
      columnMap.set(header?.toLowerCase().trim() || '', index);
    });
    
    // Helper to get column value
    const getCol = (row: any[], colName: string): any => {
      const variations = [
        colName.toLowerCase(),
        colName.replace(/\s+/g, '').toLowerCase(),
        colName.replace(/\s+/g, '_').toLowerCase()
      ];
      
      for (const variant of variations) {
        if (columnMap.has(variant)) {
          return row[columnMap.get(variant)!];
        }
      }
      return null;
    };
    
    // Process data rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const record: OneMapStatusChange = {
        property_id: String(getCol(row, 'Property ID') || getCol(row, 'property_id') || ''),
        pole_number: getCol(row, 'Pole Number') || getCol(row, 'pole_number') || null,
        drop_number: getCol(row, 'Drop Number') || getCol(row, 'drop_number') || null,
        status: getCol(row, 'Status') || '',
        status_date: this.parseDate(getCol(row, 'Date')),
        zone: getCol(row, 'Zone') || null,
        feeder: getCol(row, 'Feeder') || null,
        distribution: getCol(row, 'Distribution') || null,
        contractor: getCol(row, 'Contractor') || getCol(row, 'Agent') || null,
        import_batch_id: batchId,
        raw_data: row
      };
      
      // Only add if we have minimum required data
      if (record.property_id && record.status) {
        records.push(record);
      }
    }
    
    return records;
  }

  /**
   * Parse various date formats
   */
  private parseDate(value: any): Date {
    if (!value) return new Date();
    
    // Excel serial date
    if (typeof value === 'number') {
      return new Date((value - 25569) * 86400 * 1000);
    }
    
    // Try parsing as string
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Bulk insert status changes
   */
  private async bulkInsertStatusChanges(records: OneMapStatusChange[]): Promise<void> {
    // First, ensure the table exists with all columns
    await this.ensureOneMapTableExists();
    
    // Prepare values for bulk insert
    const values = records.map(r => [
      r.property_id,
      r.pole_number,
      r.drop_number,
      r.status,
      r.status_date,
      r.zone,
      r.feeder,
      r.distribution,
      r.contractor,
      r.import_batch_id,
      JSON.stringify(r.raw_data)
    ]);
    
    // Create placeholders for bulk insert
    const placeholders = values.map((_, i) => 
      `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, $${i * 11 + 10}, $${i * 11 + 11})`
    ).join(', ');
    
    const flatValues = values.flat();
    
    await this.neonService.query(`
      INSERT INTO onemap_status_changes 
      (property_id, pole_number, drop_number, status, status_date, zone, feeder, distribution, contractor, import_batch_id, raw_data)
      VALUES ${placeholders}
      ON CONFLICT (property_id, status, status_date) DO UPDATE
      SET 
        pole_number = EXCLUDED.pole_number,
        drop_number = EXCLUDED.drop_number,
        zone = EXCLUDED.zone,
        feeder = EXCLUDED.feeder,
        distribution = EXCLUDED.distribution,
        contractor = EXCLUDED.contractor,
        import_batch_id = EXCLUDED.import_batch_id,
        raw_data = EXCLUDED.raw_data,
        updated_at = NOW()
    `, flatValues).toPromise();
  }

  /**
   * Ensure OneMap tables exist
   */
  private async ensureOneMapTableExists(): Promise<void> {
    // Create import batches table
    await this.neonService.query(`
      CREATE TABLE IF NOT EXISTS onemap_import_batches (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        import_date TIMESTAMP NOT NULL,
        record_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'processing',
        error_message TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `).toPromise();
    
    // Create status changes table with all columns
    await this.neonService.query(`
      CREATE TABLE IF NOT EXISTS onemap_status_changes (
        id SERIAL PRIMARY KEY,
        property_id VARCHAR(255) NOT NULL,
        pole_number VARCHAR(255),
        drop_number VARCHAR(255),
        status VARCHAR(500) NOT NULL,
        status_date TIMESTAMP NOT NULL,
        zone VARCHAR(255),
        feeder VARCHAR(255),
        distribution VARCHAR(255),
        contractor VARCHAR(255),
        import_batch_id INTEGER REFERENCES onemap_import_batches(id),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(property_id, status, status_date)
      )
    `).toPromise();
    
    // Create indices for performance
    await this.neonService.query(`
      CREATE INDEX IF NOT EXISTS idx_onemap_pole_number ON onemap_status_changes(pole_number);
      CREATE INDEX IF NOT EXISTS idx_onemap_status ON onemap_status_changes(status);
      CREATE INDEX IF NOT EXISTS idx_onemap_status_date ON onemap_status_changes(status_date);
      CREATE INDEX IF NOT EXISTS idx_onemap_import_batch ON onemap_status_changes(import_batch_id);
    `).toPromise();
  }

  /**
   * Get recent import batches
   */
  getRecentImports(limit: number = 10): Observable<OneMapImportBatch[]> {
    return this.neonService.query<OneMapImportBatch>(`
      SELECT * FROM onemap_import_batches 
      ORDER BY import_date DESC 
      LIMIT $1
    `, [limit]);
  }

  /**
   * Get status changes for a specific pole
   */
  getPoleStatusHistory(poleNumber: string): Observable<OneMapStatusChange[]> {
    return this.neonService.query<OneMapStatusChange>(`
      SELECT * FROM onemap_status_changes 
      WHERE pole_number = $1 
      ORDER BY status_date DESC
    `, [poleNumber]);
  }

  /**
   * Get latest status for all poles
   */
  getLatestPoleStatuses(projectFilter?: string): Observable<any[]> {
    let query = `
      WITH latest_status AS (
        SELECT DISTINCT ON (pole_number) 
          pole_number,
          status,
          status_date,
          zone,
          contractor
        FROM onemap_status_changes 
        WHERE pole_number IS NOT NULL
    `;
    
    if (projectFilter) {
      query += ` AND zone LIKE $1`;
    }
    
    query += `
        ORDER BY pole_number, status_date DESC
      )
      SELECT * FROM latest_status
      ORDER BY pole_number
    `;
    
    return this.neonService.query(query, projectFilter ? [`%${projectFilter}%`] : undefined);
  }

  /**
   * Get status analytics
   */
  getStatusAnalytics(): Observable<any[]> {
    return this.neonService.query(`
      SELECT 
        status,
        COUNT(DISTINCT property_id) as property_count,
        COUNT(DISTINCT pole_number) as pole_count,
        COUNT(DISTINCT drop_number) as drop_count,
        MIN(status_date) as first_occurrence,
        MAX(status_date) as last_occurrence
      FROM onemap_status_changes
      GROUP BY status
      ORDER BY property_count DESC
    `);
  }
}