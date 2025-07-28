#!/usr/bin/env node

/**
 * vf-onemap-data Import Using User Authentication
 * ===============================================
 * 
 * Works with your Firebase CLI login (no service account needed)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check Firebase login
try {
  const user = execSync('firebase login:list', { encoding: 'utf8' });
  console.log('✅ Logged in as:', user.trim());
} catch (error) {
  console.error('❌ Not logged in to Firebase CLI');
  console.error('Run: firebase login');
  process.exit(1);
}

// Set project
try {
  execSync('firebase use vf-onemap-data', { encoding: 'utf8' });
  console.log('✅ Using project: vf-onemap-data');
} catch (error) {
  console.error('❌ Could not set project to vf-onemap-data');
  process.exit(1);
}

// Create import script using Firestore REST API
const importScript = `
const fs = require('fs');
const https = require('https');

// Your Firebase login token
const token = process.env.FIREBASE_TOKEN || '';

// Make authenticated request to Firestore
function firestoreRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: '/v1/projects/vf-onemap-data/databases/(default)/documents' + path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Your import logic here
console.log('Ready to import to vf-onemap-data using your Firebase login!');
`;

console.log('');
console.log('🚀 vf-onemap-data Import Setup');
console.log('==============================');
console.log('');
console.log('Since service account keys are disabled, we have these options:');
console.log('');
console.log('1. Use Firebase Hosting + Functions to create an import API');
console.log('2. Use Google Cloud Shell (has automatic auth)');
console.log('3. Enable Application Default Credentials locally');
console.log('');
console.log('Let me set up option 3 for you...');