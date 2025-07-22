#!/usr/bin/env node

/**
 * Setup CORS for Firebase Storage to allow uploads from FibreFlow
 * This ensures Janice can upload from the web interface
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Create CORS configuration
const corsConfig = {
  "origin": [
    "http://localhost:4200",
    "https://fibreflow-73daf.web.app",
    "https://fibreflow-73daf.firebaseapp.com"
  ],
  "method": ["GET", "PUT", "POST"],
  "maxAgeSeconds": 3600
};

// Save CORS config
fs.writeFileSync('cors.json', JSON.stringify(corsConfig, null, 2));

console.log('📋 CORS Configuration:');
console.log(JSON.stringify(corsConfig, null, 2));

console.log('\n🚀 Applying CORS settings to VF OneMap Storage...');

try {
  execSync('gsutil cors set cors.json gs://vf-onemap-data.firebasestorage.app', { stdio: 'inherit' });
  console.log('✅ CORS configuration applied successfully!');
  
  // Clean up
  fs.unlinkSync('cors.json');
} catch (error) {
  console.error('❌ Failed to apply CORS settings:', error.message);
  console.log('\n💡 Manual setup:');
  console.log('1. Save the cors.json file');
  console.log('2. Run: gsutil cors set cors.json gs://vf-onemap-data.firebasestorage.app');
}

console.log('\n✨ Storage is ready for web uploads!');