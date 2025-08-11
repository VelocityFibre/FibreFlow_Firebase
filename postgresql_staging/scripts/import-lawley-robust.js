#!/usr/bin/env node

/**
 * Simplified Excel to PostgreSQL Import Script
 * Handles data type issues more gracefully
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = require('../config/database.json');
const columnMapping = require('../config/column-mapping.json');

class SimpleLawleyImporter {
    constructor() {
        this.pool = new Pool(config.postgres);
        this.batchId = uuidv4();
        this.stats = {
            totalRows: 0,
            processedRows: 0,
            successfulRows: 0,
            failedRows: 0,
            newEntities: 0,
            updatedEntities: 0,
            errors: []
        };
    }

    async importFile(filePath) {
        const expandedPath = filePath.replace('~', os.homedir());
        const fileName = path.basename(expandedPath);
        
        console.log(`🔍 Starting simplified import of ${fileName}`);
        console.log(`📊 Batch ID: ${this.batchId}`);
        
        try {
            // Read Excel file
            const data = await this.readExcelFile(expandedPath);
            
            // Create batch record
            await this.createBatch(fileName);
            
            // Process all rows
            await this.processAllRows(data, fileName);
            
            // Complete batch
            await this.completeBatch();
            
            // Print summary
            this.printSummary();
            
        } catch (error) {
            console.error(`❌ Import failed: ${error.message}`);
            await this.failBatch(error);
        } finally {
            await this.pool.end();
        }
    }

    async readExcelFile(filePath) {
        console.log(`📖 Reading Excel file...`);
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        this.stats.totalRows = jsonData.length;
        console.log(`📊 Found ${jsonData.length} rows to process`);
        
        return jsonData;
    }

    async processAllRows(data, fileName) {
        console.log(`⚡ Processing ${data.length} rows...`);
        
        for (let i = 0; i < data.length; i++) {
            if (i % 100 === 0 && i > 0) {
                console.log(`   Processed ${i}/${data.length} rows...`);
            }
            
            try {
                await this.processRow(data[i], fileName, i + 2);
                this.stats.processedRows++;
                this.stats.successfulRows++;
            } catch (error) {
                this.stats.failedRows++;
                this.stats.errors.push({
                    row: i + 2,
                    error: error.message
                });
                
                // Only show first few errors
                if (this.stats.errors.length <= 5) {
                    console.error(`⚠️  Row ${i + 2}: ${error.message}`);
                }
            }
        }
    }

    async processRow(row, fileName, rowNumber) {
        const client = await this.pool.connect();
        
        try {
            // Clean the data
            const cleanedData = this.cleanRowData(row);
            
            // Check if exists
            const existsQuery = `
                SELECT id FROM onemap_lawley_raw 
                WHERE source_file = $1 AND property_id = $2
            `;
            
            const existsResult = await client.query(existsQuery, [
                fileName,
                cleanedData.property_id
            ]);
            
            if (existsResult.rows.length > 0) {
                // Update existing
                await this.updateRow(client, existsResult.rows[0].id, cleanedData);
                this.stats.updatedEntities++;
            } else {
                // Insert new
                await this.insertRow(client, cleanedData, fileName, rowNumber);
                this.stats.newEntities++;
            }
            
        } finally {
            client.release();
        }
    }

    cleanRowData(row) {
        const cleaned = {
            source_file: null,
            row_number: null
        };
        
        // Process each field
        for (const [excelColumn, value] of Object.entries(row)) {
            const dbColumn = columnMapping[excelColumn];
            
            if (!dbColumn) continue;
            
            // Handle empty values
            if (value === '' || value === null || value === undefined) {
                cleaned[dbColumn] = null;
                continue;
            }
            
            // Handle specific columns that need special treatment
            if (dbColumn === 'latitude_longitude') {
                // This field contains both lat and long, store as text
                cleaned[dbColumn] = value;
                
                // Try to split and populate individual lat/long fields
                if (typeof value === 'string' && value.includes(',')) {
                    const parts = value.split(',');
                    if (parts.length === 2) {
                        const lat = parseFloat(parts[0].trim());
                        const lng = parseFloat(parts[1].trim());
                        if (!isNaN(lat)) cleaned.latitude = lat;
                        if (!isNaN(lng)) cleaned.longitude = lng;
                    }
                }
            } else if (dbColumn === 'property_id' || dbColumn === 'sections' || 
                      dbColumn === 'pons' || dbColumn === 'stand_number') {
                // Integer fields
                const intVal = parseInt(value);
                cleaned[dbColumn] = isNaN(intVal) ? null : intVal;
            } else if (dbColumn === 'id_number' || dbColumn.includes('contact_number')) {
                // BIGINT fields
                const cleanedNum = value.toString().replace(/\D/g, '');
                const bigIntVal = cleanedNum ? parseInt(cleanedNum) : null;
                cleaned[dbColumn] = bigIntVal;
            } else if (dbColumn === 'latitude' || dbColumn === 'longitude' || 
                      dbColumn.includes('_latitude') || dbColumn.includes('_longitude')) {
                // Decimal fields
                const floatVal = parseFloat(value);
                cleaned[dbColumn] = isNaN(floatVal) ? null : floatVal;
            } else {
                // Everything else as text
                cleaned[dbColumn] = value.toString();
            }
        }
        
        // Calculate data quality score
        cleaned.data_quality_score = this.calculateQualityScore(cleaned);
        
        return cleaned;
    }

    calculateQualityScore(data) {
        let score = 0;
        let maxScore = 0;
        
        const keyFields = {
            'property_id': 0.2,
            'status': 0.2,
            'pole_number': 0.15,
            'latitude': 0.15,
            'longitude': 0.15,
            'location_address': 0.15
        };
        
        for (const [field, weight] of Object.entries(keyFields)) {
            maxScore += weight;
            if (data[field] !== null && data[field] !== undefined) {
                score += weight;
            }
        }
        
        return Math.round((score / maxScore) * 100) / 100;
    }

    async insertRow(client, data, fileName, rowNumber) {
        // Build dynamic insert query based on non-null fields
        const fields = ['"source_file"', '"row_number"'];
        const values = [fileName, rowNumber];
        const placeholders = ['$1', '$2'];
        
        let paramIndex = 3;
        for (const [field, value] of Object.entries(data)) {
            if (field !== 'source_file' && field !== 'row_number' && value !== null) {
                fields.push(`"${field}"`);  // Quote column names
                values.push(value);
                placeholders.push(`$${paramIndex}`);
                paramIndex++;
            }
        }
        
        const query = `
            INSERT INTO onemap_lawley_raw (${fields.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING id
        `;
        
        await client.query(query, values);
    }

    async updateRow(client, id, data) {
        // Build dynamic update query
        const updates = [];
        const values = [id];
        let paramIndex = 2;
        
        for (const [field, value] of Object.entries(data)) {
            if (field !== 'source_file' && field !== 'row_number') {
                updates.push(`"${field}" = $${paramIndex}`);  // Quote column names
                values.push(value);
                paramIndex++;
            }
        }
        
        if (updates.length > 0) {
            const query = `
                UPDATE onemap_lawley_raw 
                SET ${updates.join(', ')}, "processed_at" = NOW()
                WHERE id = $1
            `;
            
            await client.query(query, values);
        }
    }

    async createBatch(fileName) {
        const query = `
            INSERT INTO onemap_import_batches (id, project_name, source_file, total_rows)
            VALUES ($1, $2, $3, $4)
        `;
        await this.pool.query(query, [this.batchId, 'Lawley', fileName, this.stats.totalRows]);
    }

    async completeBatch() {
        const query = `
            UPDATE onemap_import_batches SET
                import_completed = NOW(),
                processed_rows = $2,
                new_entities = $3,
                updated_entities = $4,
                errors = $5,
                status = 'completed'
            WHERE id = $1
        `;
        
        await this.pool.query(query, [
            this.batchId,
            this.stats.processedRows,
            this.stats.newEntities,
            this.stats.updatedEntities,
            this.stats.failedRows
        ]);
    }

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
                this.stats.failedRows,
                JSON.stringify({ message: error.message })
            ]);
        } catch (e) {
            console.error('Failed to update batch status:', e.message);
        }
    }

    printSummary() {
        console.log(`\n✅ Import Summary:`);
        console.log(`   • Total rows: ${this.stats.totalRows}`);
        console.log(`   • Processed: ${this.stats.processedRows}`);
        console.log(`   • Successful: ${this.stats.successfulRows}`);
        console.log(`   • Failed: ${this.stats.failedRows}`);
        console.log(`   • New records: ${this.stats.newEntities}`);
        console.log(`   • Updated records: ${this.stats.updatedEntities}`);
        
        if (this.stats.errors.length > 5) {
            console.log(`   • Total errors: ${this.stats.errors.length} (showing first 5)`);
        }
        
        if (this.stats.successfulRows > 0) {
            console.log(`\n🎉 Import completed successfully!`);
        } else {
            console.log(`\n❌ Import failed - no rows were successfully imported`);
        }
    }
}

// Main execution
async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node import-lawley-simple.js <excel-file-path>');
        process.exit(1);
    }

    const filePath = process.argv[2];
    const importer = new SimpleLawleyImporter();
    
    try {
        await importer.importFile(filePath);
    } catch (error) {
        console.error('💥 Import failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SimpleLawleyImporter;