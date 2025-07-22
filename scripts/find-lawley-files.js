#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function findLawleyFiles() {
  console.log('🔍 Searching for Lawley June CSV files...\n');
  
  try {
    // Get ALL files in the bucket
    const [allFiles] = await bucket.getFiles();
    
    // Filter for Lawley files
    const lawleyFiles = allFiles.filter(f => 
      f.name.toLowerCase().includes('lawley') && 
      f.name.toLowerCase().includes('june')
    );
    
    if (lawleyFiles.length > 0) {
      console.log(`✅ Found ${lawleyFiles.length} Lawley June files:\n`);
      
      // Get metadata and sort by name
      const filesWithMeta = await Promise.all(
        lawleyFiles.map(async (file) => {
          const [metadata] = await file.getMetadata();
          return { file, metadata };
        })
      );
      
      filesWithMeta
        .sort((a, b) => a.file.name.localeCompare(b.file.name))
        .forEach(({ file, metadata }) => {
          console.log(`📄 ${file.name}`);
          console.log(`   Path: ${file.name}`);
          console.log(`   Size: ${(metadata.size / 1024).toFixed(1)} KB`);
          console.log(`   Uploaded: ${new Date(metadata.timeCreated).toLocaleString()}`);
          console.log('');
        });
    } else {
      console.log('❌ No Lawley June files found\n');
      
      // Check if files might be in root or other locations
      console.log('📂 Checking all CSV files in storage:');
      const allCSV = allFiles.filter(f => f.name.endsWith('.csv'));
      console.log(`Total CSV files: ${allCSV.length}\n`);
      
      // Show last 10 CSV files
      if (allCSV.length > 0) {
        console.log('Recent CSV uploads:');
        const recentCSV = await Promise.all(
          allCSV.slice(-10).map(async (file) => {
            const [metadata] = await file.getMetadata();
            return { 
              name: file.name, 
              time: new Date(metadata.timeCreated),
              size: metadata.size
            };
          })
        );
        
        recentCSV
          .sort((a, b) => b.time - a.time)
          .forEach(({ name, time, size }) => {
            console.log(`- ${name} (${(size/1024).toFixed(1)}KB) - ${time.toLocaleString()}`);
          });
      }
    }
    
    // Also check specific patterns
    console.log('\n🔎 Checking for files with specific patterns:');
    const patterns = [
      'Lawley June Week 2',
      'Lawley June Week 3', 
      'Lawley June Week 4',
      'csv-uploads/Lawley'
    ];
    
    for (const pattern of patterns) {
      const matches = allFiles.filter(f => f.name.includes(pattern));
      if (matches.length > 0) {
        console.log(`\nPattern "${pattern}" found ${matches.length} files:`);
        matches.forEach(f => console.log(`  - ${f.name}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findLawleyFiles();