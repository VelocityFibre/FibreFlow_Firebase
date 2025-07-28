#!/usr/bin/env node

/**
 * OneMap Smart CSV Processor
 * Automatically finds and processes the next CSV in sequence
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOWNLOADS_DIR = path.join(__dirname, '../downloads');
const LOG_FILE = path.join(__dirname, '../CSV_PROCESSING_LOG.md');

// CSV sequence pattern: Lawley May Week X DDMMYYYY.csv
const CSV_PATTERN = /Lawley May Week \d+ (\d{2})(\d{2})(\d{4}).*\.csv$/;

// Read processing log to find what's been done
function getProcessedFiles() {
    try {
        const logContent = fs.readFileSync(LOG_FILE, 'utf8');
        const processed = [];
        
        // Extract completed files from log
        const lines = logContent.split('\n');
        for (const line of lines) {
            if (line.includes('✅ Completed')) {
                const match = line.match(/Lawley May Week.*\.csv/);
                if (match) processed.push(match[0]);
            }
        }
        
        return processed;
    } catch (error) {
        console.log('No processing log found. Starting fresh.');
        return [];
    }
}

// Find all CSV files in downloads
function getAvailableCSVs() {
    try {
        const files = fs.readdirSync(DOWNLOADS_DIR);
        return files
            .filter(f => CSV_PATTERN.test(f))
            .sort((a, b) => {
                // Extract dates and sort
                const dateA = a.match(/(\d{2})(\d{2})(\d{4})/);
                const dateB = b.match(/(\d{2})(\d{2})(\d{4})/);
                if (!dateA || !dateB) return 0;
                
                const fullDateA = `${dateA[3]}-${dateA[2]}-${dateA[1]}`;
                const fullDateB = `${dateB[3]}-${dateB[2]}-${dateB[1]}`;
                
                return fullDateA.localeCompare(fullDateB);
            });
    } catch (error) {
        console.error('Error reading downloads directory:', error);
        return [];
    }
}

// Find next file to process
function getNextFile() {
    const processed = getProcessedFiles();
    const available = getAvailableCSVs();
    
    console.log('\n📊 Processing Status:');
    console.log('Processed files:', processed.length);
    console.log('Available files:', available.length);
    
    for (const file of available) {
        if (!processed.some(p => p.includes(file))) {
            return file;
        }
    }
    
    return null;
}

// Update the processing log
function updateLog(filename, status = 'processing') {
    const date = new Date().toISOString().split('T')[0];
    const fileDate = filename.match(/(\d{2})(\d{2})(\d{4})/);
    const displayDate = fileDate ? `May ${fileDate[1]}, ${fileDate[3]}` : 'Unknown';
    
    let logContent = '';
    try {
        logContent = fs.readFileSync(LOG_FILE, 'utf8');
    } catch (error) {
        // Create new log if doesn't exist
        logContent = `# OneMap CSV Processing Log\n\n## ✅ Completed Imports\n\n| Date | CSV File | Import Date | Status |\n|------|----------|-------------|--------|\n`;
    }
    
    if (status === 'completed') {
        // Move from pending to completed
        const lines = logContent.split('\n');
        let inCompletedSection = false;
        let updatedLog = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('## ✅ Completed Imports')) {
                inCompletedSection = true;
            } else if (lines[i].includes('## ⏳ Next Files')) {
                inCompletedSection = false;
                // Insert new completed entry before pending section
                updatedLog.push(`| ${displayDate} | ${filename} | ${date} | ✅ Completed |`);
            }
            
            // Skip the file if it's in pending section
            if (!lines[i].includes(filename)) {
                updatedLog.push(lines[i]);
            }
        }
        
        // Update last update date
        logContent = updatedLog.join('\n').replace(/Last Update: \d{4}-\d{2}-\d{2}/, `Last Update: ${date}`);
    }
    
    fs.writeFileSync(LOG_FILE, logContent);
}

// Main processing function
async function processNextCSV() {
    console.log('🔍 OneMap Smart CSV Processor');
    console.log('==============================\n');
    
    const nextFile = getNextFile();
    
    if (!nextFile) {
        console.log('✅ All CSV files have been processed!');
        console.log('\nProcessed files:');
        const processed = getProcessedFiles();
        processed.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
        return;
    }
    
    console.log(`\n📄 Next file to process: ${nextFile}`);
    const filePath = `downloads/${nextFile}`;
    
    // Confirm before processing
    console.log('\n🚀 Starting import...');
    console.log(`Command: node scripts/bulk-import-onemap.js "${filePath}"`);
    
    try {
        // Run the import
        updateLog(nextFile, 'processing');
        
        const output = execSync(
            `node ${path.join(__dirname, 'bulk-import-history-fast.js')} "${filePath}"`,
            { 
                cwd: path.join(__dirname, '..'),
                stdio: 'inherit'
            }
        );
        
        // Mark as completed
        updateLog(nextFile, 'completed');
        console.log('\n✅ Import completed successfully!');
        
        // Generate report
        console.log('\n📊 Generating report...');
        try {
            execSync('node scripts/generate-report-with-history.js', {
                cwd: path.join(__dirname, '..'),
                stdio: 'inherit'
            });
            console.log('✅ Report generated successfully!');
        } catch (reportError) {
            console.error('⚠️ Report generation failed:', reportError.message);
        }
        
        // Show what's next
        const remainingFile = getNextFile();
        if (remainingFile) {
            console.log(`\n📋 Next in queue: ${remainingFile}`);
        }
        
    } catch (error) {
        console.error('\n❌ Import failed:', error.message);
        console.log('Please check the error and try again.');
    }
}

// Run the processor
processNextCSV().catch(console.error);