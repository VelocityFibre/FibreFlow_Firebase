#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/';
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function downloadFile(filename, localPath) {
    return new Promise((resolve, reject) => {
        const encodedFilename = encodeURIComponent(`csv-uploads/${filename}`);
        const url = `${STORAGE_BASE}${encodedFilename}?alt=media`;
        
        console.log('📥 Downloading from:', url);
        
        const file = fs.createWriteStream(localPath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
                return;
            }
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                process.stdout.write(`\r⏳ Progress: ${percent}% (${downloadedSize}/${totalSize} bytes)`);
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log('\n✅ Download complete:', localPath);
                resolve(localPath);
            });
        }).on('error', (err) => {
            fs.unlink(localPath, () => {}); // Delete partial file
            reject(err);
        });
        
        file.on('error', (err) => {
            fs.unlink(localPath, () => {}); // Delete partial file
            reject(err);
        });
    });
}

async function processExcelFile(filepath) {
    console.log('\n🔄 Processing Excel file with DuckDB...');
    
    try {
        const { stdout, stderr } = await execPromise(
            `node ${path.join(__dirname, 'import-excel.js')} "${filepath}"`,
            { cwd: path.join(__dirname, '..') }
        );
        
        console.log(stdout);
        if (stderr) console.error('Warnings:', stderr);
        
        return true;
    } catch (error) {
        console.error('❌ Processing error:', error.message);
        return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node download-and-process.js <filename>');
        console.log('Example: node download-and-process.js 1754473447790_Lawley_01082025.xlsx');
        console.log('\nAlternatively, you can provide a local file path to process directly.');
        process.exit(1);
    }
    
    const input = args[0];
    let filepath;
    
    // Check if it's a local file
    if (fs.existsSync(input)) {
        filepath = path.resolve(input);
        console.log('📁 Using local file:', filepath);
    } else {
        // Assume it's a filename to download
        const filename = input;
        filepath = path.join(DATA_DIR, filename);
        
        try {
            await downloadFile(filename, filepath);
        } catch (error) {
            console.error('❌ Download failed:', error.message);
            console.log('\n💡 Tips:');
            console.log('1. Check the filename is correct');
            console.log('2. Ensure the file exists in Firebase Storage under csv-uploads/');
            console.log('3. Try downloading manually and provide local path');
            process.exit(1);
        }
    }
    
    // Process the file
    const success = await processExcelFile(filepath);
    
    if (success) {
        console.log('\n🎉 Processing complete!');
        console.log('📊 Query the database:');
        console.log('   duckdb OneMap/DuckDB/data/onemap.duckdb');
        console.log('   SELECT * FROM agent_performance;');
    }
}

// Run the script
main().catch(console.error);