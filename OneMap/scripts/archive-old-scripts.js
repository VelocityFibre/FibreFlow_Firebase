#!/usr/bin/env node

/**
 * Archive Old/Problematic Scripts
 * 
 * Identifies and archives scripts that may generate incorrect reports
 * or are no longer needed due to the new validation framework.
 */

const fs = require('fs');
const path = require('path');

class ScriptArchiver {
  constructor() {
    this.baseDir = path.join(__dirname, '..');
    this.archiveDir = path.join(this.baseDir, 'archive', 'old-scripts');
    this.scriptsToArchive = [];
    this.scriptsToKeep = [
      'generate-pole-status-report.js',      // New validated generator
      'test-report-validation.js',           // Test suite
      'monitor-data-quality.js',             // Monitoring
      'verify-pole-drops-integrity.js',      // Verification
      'archive-old-scripts.js'               // This script
    ];
    
    this.problematicPatterns = [
      /pole.*status.*analysis/i,
      /generate.*report/i,
      /analyze.*pole/i,
      /pole.*capacity/i
    ];
  }

  /**
   * Main archive process
   */
  async archiveOldScripts() {
    console.log('📦 Archiving Old Scripts\n');
    
    // Create archive directory
    this.ensureArchiveDir();
    
    // Scan for scripts to archive
    this.scanForScripts();
    
    // Review and confirm
    this.reviewScripts();
    
    // Perform archiving
    this.performArchiving();
    
    // Create archive manifest
    this.createArchiveManifest();
    
    console.log('\n✅ Script archiving completed!');
  }

  /**
   * Ensure archive directory exists
   */
  ensureArchiveDir() {
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
      console.log(`📁 Created archive directory: ${this.archiveDir}`);
    }
  }

  /**
   * Scan for scripts that should be archived
   */
  scanForScripts() {
    console.log('🔍 Scanning for scripts to archive...\n');
    
    // Scan main directory
    this.scanDirectory(this.baseDir, '');
    
    // Scan scripts directory  
    const scriptsDir = path.join(this.baseDir, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      this.scanDirectory(scriptsDir, 'scripts/');
    }
    
    // Scan Analysis directory
    const analysisDir = path.join(this.baseDir, 'Analysis');
    if (fs.existsSync(analysisDir)) {
      this.scanDirectory(analysisDir, 'Analysis/');
    }
    
    console.log(`Found ${this.scriptsToArchive.length} scripts to review\n`);
  }

  /**
   * Scan a specific directory
   */
  scanDirectory(dir, prefix) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile() && this.shouldArchive(file, fullPath)) {
        this.scriptsToArchive.push({
          name: file,
          path: fullPath,
          relativePath: prefix + file,
          reason: this.getArchiveReason(file, fullPath)
        });
      }
    });
  }

  /**
   * Determine if a script should be archived
   */
  shouldArchive(filename, filepath) {
    // Keep essential scripts
    if (this.scriptsToKeep.includes(filename)) {
      return false;
    }
    
    // Archive based on patterns
    const isProblematic = this.problematicPatterns.some(pattern => 
      pattern.test(filename)
    );
    
    if (isProblematic) {
      return true;
    }
    
    // Check file content for problematic patterns
    if (filename.endsWith('.js') || filename.endsWith('.py')) {
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Look for signs of old report generation
        const suspiciousPatterns = [
          /pole.*status.*analysis/i,
          /drops.*per.*pole/i,
          /capacity.*violation/i,
          /generate.*report/i
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(content));
      } catch (error) {
        // If can't read file, don't archive
        return false;
      }
    }
    
    return false;
  }

  /**
   * Get reason for archiving
   */
  getArchiveReason(filename, filepath) {
    if (this.problematicPatterns.some(p => p.test(filename))) {
      return 'Filename matches problematic pattern';
    }
    
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      
      if (/pole.*status.*analysis/i.test(content)) {
        return 'May generate incorrect pole status reports';
      }
      
      if (/drops.*per.*pole/i.test(content)) {
        return 'May calculate drops per pole incorrectly';
      }
      
      if (/capacity.*violation/i.test(content)) {
        return 'May report false capacity violations';
      }
      
      return 'Contains report generation logic';
    } catch (error) {
      return 'File analysis error';
    }
  }

  /**
   * Review scripts before archiving
   */
  reviewScripts() {
    console.log('📋 Scripts identified for archiving:\n');
    
    if (this.scriptsToArchive.length === 0) {
      console.log('No scripts need archiving.');
      return;
    }
    
    this.scriptsToArchive.forEach((script, idx) => {
      console.log(`${idx + 1}. ${script.relativePath}`);
      console.log(`   Reason: ${script.reason}`);
      console.log('');
    });
  }

  /**
   * Perform the archiving
   */
  performArchiving() {
    if (this.scriptsToArchive.length === 0) {
      return;
    }
    
    console.log('📦 Archiving scripts...\n');
    
    this.scriptsToArchive.forEach(script => {
      const archivePath = path.join(this.archiveDir, script.name);
      
      // Create backup in archive
      fs.copyFileSync(script.path, archivePath);
      
      // Remove original (comment out to keep originals)
      // fs.unlinkSync(script.path);
      
      console.log(`✅ Archived: ${script.relativePath}`);
    });
  }

  /**
   * Create archive manifest
   */
  createArchiveManifest() {
    const manifest = {
      archivedAt: new Date().toISOString(),
      reason: 'Prevent incorrect report generation after July 23, 2025 incident',
      totalArchived: this.scriptsToArchive.length,
      scripts: this.scriptsToArchive.map(script => ({
        name: script.name,
        originalPath: script.relativePath,
        reason: script.reason,
        archivedPath: `archive/old-scripts/${script.name}`
      })),
      replacement: {
        standardGenerator: 'scripts/generate-pole-status-report.js',
        testSuite: 'scripts/test-report-validation.js',
        monitoring: 'scripts/monitor-data-quality.js',
        verification: 'verify-pole-drops-integrity.js'
      },
      notes: [
        'These scripts were archived to prevent generation of incorrect reports',
        'Use the new standardized report generator with built-in validation',
        'All archived scripts are preserved for reference',
        'Contact team lead before restoring any archived scripts'
      ]
    };
    
    const manifestPath = path.join(this.archiveDir, 'ARCHIVE_MANIFEST.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`\n📄 Archive manifest saved: ${manifestPath}`);
  }
}

// Main execution
const archiver = new ScriptArchiver();
archiver.archiveOldScripts().catch(console.error);