#!/usr/bin/env node

/**
 * Excel to PostgreSQL Import Script for Lawley OneMap Data
 * 
 * Features:
 * - Direct Excel to PostgreSQL import
 * - Status change detection and history tracking
 * - Batch processing with error handling
 * - Data quality scoring
 * - Cross-validation support
 * 
 * Usage:
 *   node scripts/import-lawley-excel.js ~/Downloads/1754473447790_Lawley_01082025.xlsx
 *   node scripts/import-lawley-excel.js ~/Downloads/*.xlsx  # Batch import
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = require('../config/database.json');
const dbConfig = config.postgres;

class LawleyExcelImporter {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.batchId = uuidv4();
        this.stats = {
            totalRows: 0,
            processedRows: 0,
            newEntities: 0,
            updatedEntities: 0,
            statusChanges: 0,
            errors: 0,
            startTime: new Date()
        };
    }

    /**
     * Main import function
     */
    async importFile(filePath) {
        const expandedPath = filePath.replace('~', os.homedir());
        const fileName = path.basename(expandedPath);
        
        console.log(`🔍 Starting import of ${fileName}`);
        console.log(`📊 Batch ID: ${this.batchId}`);
        
        try {
            // Create batch record
            await this.createBatch(fileName);
            
            // Read and validate Excel file
            const data = await this.readExcelFile(expandedPath);
            
            // Process data in chunks
            await this.processData(data, fileName);
            
            // Complete batch
            await this.completeBatch();
            
            console.log(`✅ Import completed successfully!`);
            this.printStats();
            
            // Generate import report
            console.log(`\n📊 Generating import report...`);
            const ReportGenerator = require('./generate-import-report');
            const reportGen = new ReportGenerator();
            await reportGen.generateReport(this.batchId, true); // Include validation
            console.log(`📄 Report generated in reports/ directory`);
            
        } catch (error) {
            console.error(`❌ Import failed: ${error.message}`);
            await this.failBatch(error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Read Excel file and convert to JSON
     */
    async readExcelFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        console.log(`📖 Reading Excel file...`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        if (jsonData.length === 0) {
            throw new Error('No data found in Excel file');
        }

        this.stats.totalRows = jsonData.length;
        console.log(`📊 Found ${jsonData.length} rows to process`);
        
        return jsonData;
    }

    /**
     * Process data in batches with status tracking
     */
    async processData(data, fileName) {
        const batchSize = config.import.batchSize || 1000;
        console.log(`⚡ Processing in batches of ${batchSize}...`);

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1} (rows ${i+1}-${Math.min(i+batchSize, data.length)})`);
            
            await this.processBatch(batch, fileName, i + 2); // +2 because Excel is 1-indexed and has header row
        }
    }

    /**
     * Process a single batch of rows
     */
    async processBatch(batch, fileName, startRowNum) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (let i = 0; i < batch.length; i++) {
                const row = batch[i];
                const rowNum = startRowNum + i;
                
                try {
                    await this.processRow(client, row, fileName, rowNum);
                    this.stats.processedRows++;
                } catch (error) {
                    console.error(`⚠️  Error processing row ${rowNum}: ${error.message}`);
                    this.stats.errors++;
                    // Continue processing other rows
                }
            }
            
            await client.query('COMMIT');
            console.log(`✓ Batch committed successfully`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Process a single row with status change detection
     */
    async processRow(client, row, fileName, rowNum) {
        // Clean and prepare data
        const cleanedRow = this.cleanRowData(row);
        const qualityScore = this.calculateQualityScore(cleanedRow);
        
        // Check if record already exists (by property_id and source_file)
        const existingQuery = `
            SELECT id, status, field_agent_name_pole_permission, pole_number
            FROM onemap_lawley_raw 
            WHERE source_file = $1 AND property_id = $2
        `;
        const existingResult = await client.query(existingQuery, [fileName, cleanedRow['property_id']]);
        
        let recordId;
        const isUpdate = existingResult.rows.length > 0;
        
        if (isUpdate) {
            // Update existing record and track changes
            recordId = existingResult.rows[0].id;
            await this.updateRecord(client, recordId, cleanedRow, fileName, rowNum, qualityScore);
            await this.trackChanges(client, existingResult.rows[0], cleanedRow, fileName, recordId);
            this.stats.updatedEntities++;
        } else {
            // Insert new record
            recordId = await this.insertRecord(client, cleanedRow, fileName, rowNum, qualityScore);
            this.stats.newEntities++;
            
            // Track as new entity creation
            await this.trackNewEntity(client, cleanedRow, fileName, recordId);
        }
    }

    /**
     * Insert new record
     */
    async insertRecord(client, row, fileName, rowNum, qualityScore) {
        const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
        const placeholders = Object.keys(row).map((_, index) => `$${index + 4}`).join(', ');
        const values = Object.values(row);
        
        const insertQuery = `
            INSERT INTO onemap_lawley_raw (
                source_file, row_number, data_quality_score, ${columns}
            ) VALUES ($1, $2, $3, ${placeholders})
            RETURNING id
        `;
        
        const result = await client.query(insertQuery, [fileName, rowNum, qualityScore, ...values]);
        return result.rows[0].id;
    }

    /**
     * Update existing record
     */
    async updateRecord(client, recordId, row, fileName, rowNum, qualityScore) {
        const updates = Object.keys(row)
            .map((col, index) => `"${col}" = $${index + 3}`)
            .join(', ');
        const values = Object.values(row);
        
        const updateQuery = `
            UPDATE onemap_lawley_raw 
            SET ${updates}, data_quality_score = $${values.length + 3}, processed_at = NOW()
            WHERE id = $1
        `;
        
        await client.query(updateQuery, [recordId, qualityScore, ...values]);
    }

    /**
     * Track changes between old and new data
     */
    async trackChanges(client, oldRecord, newRow, fileName, recordId) {
        const entityId = newRow['property_id']?.toString() || newRow['pole_number'] || 'unknown';
        const entityType = newRow['pole_number'] ? 'pole' : 'property';
        
        // Compare key fields for changes
        const keyFields = ['status', 'field_agent_name_pole_permission', 'pole_number'];
        
        for (const field of keyFields) {
            const oldValue = oldRecord[field];
            const newValue = newRow[field];
            
            if (oldValue !== newValue && (oldValue || newValue)) {
                await this.recordStatusChange(client, {
                    entityType,
                    entityId,
                    fieldName: field,
                    oldValue: oldValue || null,
                    newValue: newValue || null,
                    sourceFile: fileName,
                    recordId
                });
                
                this.stats.statusChanges++;
                
                console.log(`📝 Status change detected: ${entityId} ${field}: "${oldValue}" → "${newValue}"`);
            }
        }
    }

    /**
     * Track new entity creation
     */
    async trackNewEntity(client, row, fileName, recordId) {
        const entityId = row['property_id']?.toString() || row['pole_number'] || 'unknown';
        const entityType = row['pole_number'] ? 'pole' : 'property';
        
        // Record creation of new entity
        await this.recordStatusChange(client, {
            entityType,
            entityId,
            fieldName: 'status',
            oldValue: null,
            newValue: row['status'] || 'created',
            sourceFile: fileName,
            recordId,
            changeType: 'create'
        });
    }

    /**
     * Record a status change in the history table
     */
    async recordStatusChange(client, change) {
        const insertQuery = `
            INSERT INTO onemap_status_history (
                project_name, entity_type, entity_id, field_name,
                old_value, new_value, source_file, import_batch_id,
                change_type, raw_data_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        await client.query(insertQuery, [
            'Lawley',
            change.entityType,
            change.entityId,
            change.fieldName,
            change.oldValue,
            change.newValue,
            change.sourceFile,
            this.batchId,
            change.changeType || 'update',
            change.recordId
        ]);
    }

    /**
     * Clean and normalize row data
     */
    cleanRowData(row) {
        const cleaned = {};
        
        // Load the complete column mapping
        const columnMapping = require('../config/column-mapping.json');
        
        for (const [key, value] of Object.entries(row)) {
            // Get the mapped column name from our generated mapping
            let dbColumnName = columnMapping[key];
            
            if (!dbColumnName) {
                // If not in mapping, generate a name (shouldn't happen with complete mapping)
                dbColumnName = key.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '')
                    .replace(/__+/g, '_');
                console.warn(`Warning: Column "${key}" not in mapping, using: ${dbColumnName}`);
            }
            
            // Convert empty strings to null
            let cleanValue = value === '' ? null : value;
            
            // Handle specific field types
            if (key.includes('date') && cleanValue) {
                // Try to standardize dates
                try {
                    if (typeof cleanValue === 'string' && cleanValue.includes('/')) {
                        // Convert MM/DD/YYYY to YYYY-MM-DD format if needed
                        cleanValue = cleanValue; // Keep original for now
                    }
                } catch (e) {
                    // Keep original if conversion fails
                }
            }
            
            // Handle numeric fields
            if (dbColumnName === 'property_id' || dbColumnName === 'id_number' || dbColumnName === 'contact_number_e_g_0123456789') {
                if (cleanValue && !isNaN(cleanValue)) {
                    cleanValue = dbColumnName === 'property_id' ? parseInt(cleanValue) : cleanValue;
                }
            }
            
            // Handle coordinates
            if (dbColumnName === 'latitude' || dbColumnName === 'longitude') {
                if (cleanValue && !isNaN(cleanValue)) {
                    cleanValue = parseFloat(cleanValue);
                }
            }
            
            cleaned[dbColumnName] = cleanValue;
        }
        
        return cleaned;
    }

    /**
     * Calculate data quality score (0.00 to 1.00)
     */
    calculateQualityScore(row) {
        let score = 0;
        let maxScore = 0;
        
        // Key fields and their weights
        const keyFields = {
            'property_id': 0.2,        // Essential
            'status': 0.2,             // Essential
            'pole_number': 0.15,       // Important for poles
            'latitude': 0.15,          // Important for location
            'longitude': 0.15,         // Important for location
            'field_agent_name__pole_permission_': 0.1,  // Tracking
            'location_address': 0.05   // Nice to have
        };
        
        for (const [field, weight] of Object.entries(keyFields)) {
            maxScore += weight;
            if (row[field] && row[field] !== null && row[field] !== '') {
                score += weight;
            }
        }
        
        return Math.round((score / maxScore) * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Create batch tracking record
     */
    async createBatch(fileName) {
        const query = `
            INSERT INTO onemap_import_batches (id, project_name, source_file, total_rows)
            VALUES ($1, $2, $3, $4)
        `;
        await this.pool.query(query, [this.batchId, 'Lawley', fileName, this.stats.totalRows]);
    }

    /**
     * Mark batch as completed
     */
    async completeBatch() {
        const query = `
            UPDATE onemap_import_batches SET
                import_completed = NOW(),
                processed_rows = $2,
                new_entities = $3,
                updated_entities = $4,
                status_changes = $5,
                errors = $6,
                status = 'completed'
            WHERE id = $1
        `;
        
        await this.pool.query(query, [
            this.batchId,
            this.stats.processedRows,
            this.stats.newEntities,
            this.stats.updatedEntities,
            this.stats.statusChanges,
            this.stats.errors
        ]);
    }

    /**
     * Mark batch as failed
     */
    async failBatch(error) {
        try {
            const query = `
                UPDATE onemap_import_batches SET
                    import_completed = NOW(),
                    processed_rows = $2,
                    errors = $3,
                    status = 'failed',
                    error_details = $4
                WHERE id = $1
            `;
            
            await this.pool.query(query, [
                this.batchId,
                this.stats.processedRows,
                this.stats.errors,
                JSON.stringify({ message: error.message, stack: error.stack })
            ]);
        } catch (e) {
            console.error('Failed to update batch status:', e.message);
        }
    }

    /**
     * Print import statistics
     */
    printStats() {
        const duration = (new Date() - this.stats.startTime) / 1000;
        
        console.log(`\n📊 Import Statistics:`);
        console.log(`   • Total rows: ${this.stats.totalRows}`);
        console.log(`   • Processed: ${this.stats.processedRows}`);
        console.log(`   • New entities: ${this.stats.newEntities}`);
        console.log(`   • Updated entities: ${this.stats.updatedEntities}`);
        console.log(`   • Status changes: ${this.stats.statusChanges}`);
        console.log(`   • Errors: ${this.stats.errors}`);
        console.log(`   • Duration: ${duration.toFixed(2)}s`);
        console.log(`   • Rate: ${(this.stats.processedRows / duration).toFixed(0)} rows/sec`);
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.pool.end();
    }
}

// Main execution
async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node import-lawley-excel.js <excel-file-path>');
        process.exit(1);
    }

    const filePath = process.argv[2];
    const importer = new LawleyExcelImporter();
    
    try {
        await importer.importFile(filePath);
        console.log('🎉 Import completed successfully!');
    } catch (error) {
        console.error('💥 Import failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = LawleyExcelImporter;