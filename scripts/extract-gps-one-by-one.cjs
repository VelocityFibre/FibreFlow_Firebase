const fs = require('fs').promises;
const path = require('path');

const IMAGE_DIR = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';
const DATA_FILE = './reports/extracted-gps-data.json';

// Load existing data or create new
async function loadExistingData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save data
async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Process specific image by index
async function processImage(index) {
  const files = await fs.readdir(IMAGE_DIR);
  const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
  
  if (index >= jpgFiles.length) {
    console.log('❌ Index out of range');
    return;
  }
  
  const fileName = jpgFiles[index];
  const imagePath = path.join(IMAGE_DIR, fileName);
  
  console.log(`\n📷 Processing image ${index + 1}/${jpgFiles.length}: ${fileName}`);
  console.log(`📁 Path: ${imagePath}`);
  console.log('\n⚠️  Please view the image and extract the GPS data from the overlay');
  console.log('The overlay is at the bottom of the image and contains:');
  console.log('- Full address');
  console.log('- GPS coordinates (Lat and Long)');
  console.log('- Date and time');
  
  return fileName;
}

// Add extracted data
async function addExtractedData(fileName, address, latitude, longitude, dateTime) {
  const data = await loadExistingData();
  
  data[fileName] = {
    address,
    latitude,
    longitude,
    dateTime,
    extractedAt: new Date().toISOString()
  };
  
  await saveData(data);
  console.log(`✅ Data saved for ${fileName}`);
  
  // Show progress
  const totalExtracted = Object.keys(data).length;
  console.log(`📊 Progress: ${totalExtracted} images extracted`);
}

// Check progress
async function checkProgress() {
  const data = await loadExistingData();
  const files = await fs.readdir(IMAGE_DIR);
  const jpgFiles = files.filter(f => f.endsWith('.JPG'));
  
  const extracted = Object.keys(data).length;
  const total = jpgFiles.length;
  const pending = total - extracted;
  
  console.log('\n📊 EXTRACTION PROGRESS');
  console.log('='.repeat(30));
  console.log(`Total images: ${total}`);
  console.log(`Extracted: ${extracted} (${(extracted/total*100).toFixed(1)}%)`);
  console.log(`Pending: ${pending}`);
  
  if (extracted > 0) {
    console.log('\n📍 Sample extracted data:');
    const samples = Object.entries(data).slice(0, 3);
    samples.forEach(([file, info]) => {
      console.log(`\n${file}:`);
      console.log(`  Address: ${info.address}`);
      console.log(`  GPS: ${info.latitude}, ${info.longitude}`);
    });
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'check') {
    await checkProgress();
  } else if (command === 'view') {
    const index = parseInt(args[1] || '0');
    await processImage(index);
  } else if (command === 'add') {
    const fileName = args[1];
    const address = args[2];
    const latitude = parseFloat(args[3]);
    const longitude = parseFloat(args[4]);
    const dateTime = args[5];
    
    if (!fileName || !address || !latitude || !longitude || !dateTime) {
      console.log('Usage: node extract-gps-one-by-one.js add FILENAME "ADDRESS" LATITUDE LONGITUDE "DATETIME"');
      return;
    }
    
    await addExtractedData(fileName, address, latitude, longitude, dateTime);
  } else {
    console.log('\n📍 GPS EXTRACTION TOOL');
    console.log('='.repeat(30));
    console.log('\nCommands:');
    console.log('  check                - Check extraction progress');
    console.log('  view INDEX           - View image by index (0-based)');
    console.log('  add FILENAME "ADDRESS" LAT LONG "DATETIME" - Add extracted data');
    console.log('\nExample:');
    console.log('  node extract-gps-one-by-one.js view 10');
    console.log('  node extract-gps-one-by-one.js add "ABCD1234.JPG" "Main St, Lawley" -26.123 27.456 "07/23/2025 10:00 AM"');
  }
}

main();