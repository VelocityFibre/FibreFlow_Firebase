import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header.trim()] = values[i]?.trim() || '';
    });
    return obj;
  });
}

async function debugMatching() {
  const june3Data = fs.readFileSync(path.join(__dirname, '../downloads/june3.csv'), 'utf8');
  const june5Data = fs.readFileSync(path.join(__dirname, '../downloads/june5.csv'), 'utf8');
  
  const june3Records = parseCSV(june3Data);
  const june5Records = parseCSV(june5Data);
  
  console.log('🔍 Debug Property ID Matching\n');
  
  // Check headers
  const june3Headers = june3Data.split('\n')[0].split(',').map(h => h.trim());
  const june5Headers = june5Data.split('\n')[0].split(',').map(h => h.trim());
  
  console.log('June 3 Headers:', june3Headers.slice(0, 5));
  console.log('June 5 Headers:', june5Headers.slice(0, 5));
  
  // Sample first few records
  console.log('\nSample June 3 records:');
  june3Records.slice(0, 3).forEach(r => {
    console.log(`Property ID: "${r['Property ID']}", Status: "${r['Status']}", Pole: "${r['Pole Number']}"`);
  });
  
  console.log('\nSample June 5 records:');
  june5Records.slice(0, 3).forEach(r => {
    console.log(`Property ID: "${r['Property ID']}", Status: "${r['Status']}", Pole: "${r['Pole Number']}"`);
  });
  
  // Try to find matching Property IDs
  const june3PropertyIds = new Set(june3Records.map(r => r['Property ID']));
  const june5PropertyIds = new Set(june5Records.map(r => r['Property ID']));
  
  let matchCount = 0;
  june5PropertyIds.forEach(id => {
    if (june3PropertyIds.has(id)) {
      matchCount++;
    }
  });
  
  console.log(`\nProperty ID Overlap: ${matchCount} matching IDs`);
  
  // Check if we're comparing the right field
  if (matchCount === 0) {
    console.log('\n⚠️ No matching Property IDs found!');
    console.log('This suggests June 5 contains completely different records.');
    
    // Let's try matching by address and pole instead
    console.log('\nTrying to match by Pole Number...');
    
    const june3ByPole = new Map();
    const june5ByPole = new Map();
    
    june3Records.forEach(r => {
      if (r['Pole Number']) {
        if (!june3ByPole.has(r['Pole Number'])) {
          june3ByPole.set(r['Pole Number'], []);
        }
        june3ByPole.get(r['Pole Number']).push(r);
      }
    });
    
    june5Records.forEach(r => {
      if (r['Pole Number']) {
        if (!june5ByPole.has(r['Pole Number'])) {
          june5ByPole.set(r['Pole Number'], []);
        }
        june5ByPole.get(r['Pole Number']).push(r);
      }
    });
    
    let poleMatches = 0;
    june5ByPole.forEach((records, pole) => {
      if (june3ByPole.has(pole)) {
        poleMatches++;
      }
    });
    
    console.log(`Poles in June 3: ${june3ByPole.size}`);
    console.log(`Poles in June 5: ${june5ByPole.size}`);
    console.log(`Matching poles: ${poleMatches}`);
  }
}

debugMatching().catch(console.error);