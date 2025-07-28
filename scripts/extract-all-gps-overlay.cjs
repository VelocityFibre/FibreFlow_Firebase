const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const IMAGE_DIR = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';
const REPORT_DIR = './reports';

// OCR to extract text from GPS overlay
async function extractGPSFromOverlay(imagePath) {
  try {
    // First, let's crop the bottom part where the GPS overlay is
    const metadata = await sharp(imagePath).metadata();
    const overlayHeight = Math.floor(metadata.height * 0.15); // Bottom 15% typically contains overlay
    
    // Create a cropped image of just the overlay
    const croppedPath = imagePath.replace('.JPG', '_overlay.jpg');
    await sharp(imagePath)
      .extract({
        left: 0,
        top: metadata.height - overlayHeight,
        width: metadata.width,
        height: overlayHeight
      })
      .toFile(croppedPath);
    
    // Use Tesseract to extract text
    const { data: { text } } = await Tesseract.recognize(croppedPath, 'eng');
    
    // Clean up temp file
    await fs.unlink(croppedPath);
    
    // Parse the extracted text
    const lines = text.split('\n').filter(line => line.trim());
    
    // Extract data from text
    let address = '';
    let latitude = null;
    let longitude = null;
    let dateTime = '';
    
    // Look for address (usually first line)
    if (lines.length > 0) {
      address = lines.find(line => line.includes('South Africa') || line.includes('Lawley')) || lines[0];
    }
    
    // Look for coordinates (format: Lat: -26.xxx, Long: 27.xxx)
    const coordText = lines.join(' ');
    const latMatch = coordText.match(/Lat[:\s]*(-?\d+\.\d+)/i);
    const longMatch = coordText.match(/Long[:\s]*(-?\d+\.\d+)/i);
    
    if (latMatch) latitude = parseFloat(latMatch[1]);
    if (longMatch) longitude = parseFloat(longMatch[1]);
    
    // Look for date/time
    const dateMatch = coordText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)/i);
    if (dateMatch) {
      dateTime = dateMatch[1] + ' GMT+02:00';
    }
    
    return {
      address: address.trim(),
      latitude,
      longitude,
      dateTime,
      rawText: text
    };
    
  } catch (error) {
    console.error(`Error extracting from ${path.basename(imagePath)}:`, error.message);
    return null;
  }
}

// Process all images
async function extractAllGPSData() {
  console.log('📍 EXTRACTING GPS DATA FROM ALL 278 IMAGES\n');
  console.log('Using OCR to read GPS Map Camera overlays...\n');
  
  try {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    
    const files = await fs.readdir(IMAGE_DIR);
    const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
    
    console.log(`📷 Total images to process: ${jpgFiles.length}`);
    
    const extractedData = [];
    let successCount = 0;
    
    // Process in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < jpgFiles.length; i += batchSize) {
      const batch = jpgFiles.slice(i, Math.min(i + batchSize, jpgFiles.length));
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(jpgFiles.length/batchSize)}...`);
      
      for (let j = 0; j < batch.length; j++) {
        const fileName = batch[j];
        const index = i + j;
        const imagePath = path.join(IMAGE_DIR, fileName);
        
        process.stdout.write(`[${index + 1}/${jpgFiles.length}] ${fileName}... `);
        
        const data = await extractGPSFromOverlay(imagePath);
        
        if (data && data.latitude && data.longitude) {
          successCount++;
          extractedData.push({
            index: index + 1,
            fileName: fileName,
            poleId: `ETT-${String(index + 1).padStart(4, '0')}`,
            location: 'Lawley, Gauteng, South Africa',
            address: data.address || 'Lawley, Gauteng, South Africa',
            latitude: data.latitude,
            longitude: data.longitude,
            coordinates: `${data.latitude}, ${data.longitude}`,
            dateTime: data.dateTime || '',
            capturedBy: 'GPS Map Camera',
            uploadedBy: 'ettienejvr@gmail.com',
            status: 'Extracted'
          });
          console.log('✓');
        } else {
          extractedData.push({
            index: index + 1,
            fileName: fileName,
            poleId: `ETT-${String(index + 1).padStart(4, '0')}`,
            location: 'Lawley, Gauteng, South Africa',
            address: 'OCR extraction failed',
            latitude: '',
            longitude: '',
            coordinates: '',
            dateTime: '',
            capturedBy: 'GPS Map Camera',
            uploadedBy: 'ettienejvr@gmail.com',
            status: 'Failed'
          });
          console.log('✗');
        }
      }
    }
    
    console.log(`\n✅ Extraction complete! Successfully extracted: ${successCount}/${jpgFiles.length}`);
    
    // Create CSV
    const csvPath = path.join(REPORT_DIR, 'ettiene-extracted-gps-data.csv');
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'index', title: 'No.' },
        { id: 'fileName', title: 'File Name' },
        { id: 'poleId', title: 'Pole ID' },
        { id: 'location', title: 'Location' },
        { id: 'address', title: 'Full Address' },
        { id: 'latitude', title: 'Latitude' },
        { id: 'longitude', title: 'Longitude' },
        { id: 'coordinates', title: 'GPS Coordinates' },
        { id: 'dateTime', title: 'Date/Time' },
        { id: 'status', title: 'Extraction Status' }
      ]
    });
    
    await csvWriter.writeRecords(extractedData);
    console.log(`\n✅ CSV created: ${csvPath}`);
    
    // Create Excel
    const workbook = new ExcelJS.Workbook();
    
    // Main data sheet
    const dataSheet = workbook.addWorksheet('GPS Data');
    dataSheet.columns = [
      { header: 'No.', key: 'index', width: 8 },
      { header: 'File Name', key: 'fileName', width: 20 },
      { header: 'Pole ID', key: 'poleId', width: 12 },
      { header: 'Address', key: 'address', width: 60 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Coordinates', key: 'coordinates', width: 25 },
      { header: 'Date/Time', key: 'dateTime', width: 25 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    
    // Style header
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003399' }
    };
    
    // Add data with conditional formatting
    extractedData.forEach(row => {
      const excelRow = dataSheet.addRow(row);
      if (row.status === 'Extracted') {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
      } else {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
      }
    });
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Information', key: 'info', width: 40 },
      { header: 'Details', key: 'details', width: 60 }
    ];
    
    const successfulExtractions = extractedData.filter(d => d.status === 'Extracted');
    
    summarySheet.addRows([
      { info: 'Report Date', details: new Date().toLocaleString() },
      { info: 'Total Images', details: jpgFiles.length },
      { info: 'Successfully Extracted', details: successfulExtractions.length },
      { info: 'Failed Extractions', details: jpgFiles.length - successfulExtractions.length },
      { info: 'Success Rate', details: `${(successfulExtractions.length/jpgFiles.length*100).toFixed(1)}%` },
      { info: '', details: '' },
      { info: 'DATA SOURCE', details: 'GPS Map Camera overlay extracted via OCR' },
      { info: 'Extraction Method', details: 'Automated OCR processing with Tesseract.js' }
    ]);
    
    summarySheet.getRow(1).font = { bold: true };
    
    // Save Excel
    const excelPath = path.join(REPORT_DIR, 'ettiene-extracted-gps-data.xlsx');
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✅ Excel created: ${excelPath}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 GPS EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully extracted: ${successfulExtractions.length}`);
    console.log(`❌ Failed extractions: ${jpgFiles.length - successfulExtractions.length}`);
    console.log('\n📍 Sample extracted locations:');
    successfulExtractions.slice(0, 5).forEach(d => {
      console.log(`   ${d.fileName} - ${d.coordinates}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Start extraction
extractAllGPSData();