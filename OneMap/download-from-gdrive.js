#!/usr/bin/env node

/**
 * Google Drive Download Helper for 1Map Sync
 * 
 * This script helps download CSV files from Google Drive
 * Currently manual - future versions will use Google Drive API
 * 
 * Usage: node download-from-gdrive.js
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class GDriveDownloader {
  constructor() {
    this.downloadDir = path.join(__dirname, 'downloads');
    this.processedDir = path.join(__dirname, 'processed');
  }

  async initialize() {
    // Create directories if they don't exist
    await fs.mkdir(this.downloadDir, { recursive: true });
    await fs.mkdir(this.processedDir, { recursive: true });
    
    console.log(`📁 Download directory: ${this.downloadDir}`);
    console.log(`📁 Processed directory: ${this.processedDir}`);
  }

  /**
   * Manual download instructions
   */
  showManualInstructions() {
    console.log(`
📥 MANUAL DOWNLOAD INSTRUCTIONS
================================

1. Go to the Google Drive folder:
   https://drive.google.com/drive/u/1/folders/1NzpzLYIvTLaSD--RdhRDQLfktCuHD-W3

2. Download the latest CSV file(s) to:
   ${this.downloadDir}

3. File naming convention (recommended):
   - 1map_export_YYYYMMDD.csv
   - 1map_daily_20250721.csv

4. Once downloaded, run:
   node process-1map-sync.js ${this.downloadDir}/[filename.csv]

================================
`);
  }

  /**
   * List downloaded files
   */
  async listDownloadedFiles() {
    try {
      const files = await fs.readdir(this.downloadDir);
      const csvFiles = files.filter(f => f.endsWith('.csv'));
      
      if (csvFiles.length === 0) {
        console.log('\n❌ No CSV files found in download directory');
        return [];
      }
      
      console.log('\n📋 Available CSV files:');
      for (let i = 0; i < csvFiles.length; i++) {
        const filePath = path.join(this.downloadDir, csvFiles[i]);
        const stats = await fs.stat(filePath);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
        const modTime = stats.mtime.toISOString().split('T')[0];
        
        console.log(`${i + 1}. ${csvFiles[i]} (${sizeInMB} MB, modified: ${modTime})`);
      }
      
      return csvFiles;
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }
  }

  /**
   * Process the latest file
   */
  async processLatestFile() {
    const files = await this.listDownloadedFiles();
    
    if (files.length === 0) {
      return;
    }
    
    // Sort by modification time to get the latest
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(this.downloadDir, file);
        const stats = await fs.stat(filePath);
        return { file, mtime: stats.mtime };
      })
    );
    
    fileStats.sort((a, b) => b.mtime - a.mtime);
    const latestFile = fileStats[0].file;
    const latestPath = path.join(this.downloadDir, latestFile);
    
    console.log(`\n🎯 Latest file: ${latestFile}`);
    console.log('\n🚀 Starting sync process...\n');
    
    // Run the sync processor
    try {
      const { stdout, stderr } = await execPromise(
        `node ${path.join(__dirname, 'process-1map-sync.js')} "${latestPath}"`
      );
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      // Move to processed folder
      const processedPath = path.join(this.processedDir, `processed_${Date.now()}_${latestFile}`);
      await fs.rename(latestPath, processedPath);
      console.log(`\n✅ File moved to processed: ${processedPath}`);
      
    } catch (error) {
      console.error('❌ Error running sync:', error);
    }
  }

  /**
   * Future: Google Drive API download
   */
  async downloadFromGoogleDrive(fileId) {
    console.log('\n🔮 Google Drive API integration planned for future version');
    console.log('   Features will include:');
    console.log('   - Automatic daily downloads');
    console.log('   - File change detection');
    console.log('   - OAuth2 authentication');
    console.log('   - Scheduled sync jobs\n');
  }
}

// Helper to create a quick download script
async function createDownloadHelper() {
  const helperScript = `#!/bin/bash
# Quick download helper for 1Map sync

DOWNLOAD_DIR="${path.join(__dirname, 'downloads')}"
echo "📥 Opening download directory: $DOWNLOAD_DIR"

# Create directory if it doesn't exist
mkdir -p "$DOWNLOAD_DIR"

# Open in file manager
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$DOWNLOAD_DIR"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open "$DOWNLOAD_DIR"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  explorer "$DOWNLOAD_DIR"
fi

echo "👉 Download CSV files from Google Drive to this directory"
echo "👉 Then run: node download-from-gdrive.js"
`;

  const scriptPath = path.join(__dirname, 'open-download-folder.sh');
  await fs.writeFile(scriptPath, helperScript);
  await fs.chmod(scriptPath, '755');
  console.log(`\n✅ Created helper script: ${scriptPath}`);
}

// Main execution
async function main() {
  const downloader = new GDriveDownloader();
  await downloader.initialize();
  
  console.log(`
🔄 1MAP GOOGLE DRIVE SYNC HELPER
================================
`);
  
  // Show manual instructions
  downloader.showManualInstructions();
  
  // Create helper script
  await createDownloadHelper();
  
  // List any existing files
  const files = await downloader.listDownloadedFiles();
  
  if (files.length > 0) {
    console.log('\n❓ Would you like to process the latest file?');
    console.log('   Run: node download-from-gdrive.js --process-latest');
  }
  
  // Check for command line args
  const args = process.argv.slice(2);
  if (args.includes('--process-latest')) {
    await downloader.processLatestFile();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { GDriveDownloader };