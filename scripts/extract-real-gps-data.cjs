const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const IMAGE_DIR = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';
const REPORT_DIR = './reports';

// Real data extracted from viewing actual images
const realData = {
  'LEFU9103.JPG': {
    address: 'Piranha Crescent, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.396490,
    longitude: 27.813118,
    dateTime: '07/23/2025 11:22 AM GMT+02:00'
  },
  'UUZQ0214.JPG': {
    address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382613,
    longitude: 27.807202,
    dateTime: '07/24/2025 03:14 PM GMT+02:00'
  },
  'ARGS9536.JPG': {
    address: '2nd Avenue, Lawley Extento, Lawley, Gauteng 1830, South Africa',
    latitude: -26.373870,
    longitude: 27.810132,
    dateTime: '07/23/2025 02:05 PM GMT+02:00'
  },
  'GBBN9148.JPG': {
    address: 'Siyabonga Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.378948,
    longitude: 27.809967,
    dateTime: '07/23/2025 01:56 PM GMT+02:00'
  },
  'XHPT1307.JPG': {
    address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.383169,
    longitude: 27.812837,
    dateTime: '07/23/2025 10:13 AM GMT+02:00'
  },
  'DMWX1009.JPG': {
    address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.390316,
    longitude: 27.810644,
    dateTime: '07/23/2025 11:02 AM GMT+02:00'
  },
  'PXFC6466.JPG': {
    address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.384564,
    longitude: 27.806597,
    dateTime: '07/24/2025 03:04 PM GMT+02:00'
  }
};

// Function to process one image at a time
async function processOneImage(fileName, index) {
  // If we have real data, use it
  if (realData[fileName]) {
    return {
      index: index + 1,
      fileName: fileName,
      location: 'Lawley, Gauteng, South Africa',
      address: realData[fileName].address,
      latitude: realData[fileName].latitude,
      longitude: realData[fileName].longitude,
      coordinates: `${realData[fileName].latitude}, ${realData[fileName].longitude}`,
      dateTime: realData[fileName].dateTime,
      capturedBy: 'GPS Map Camera',
      uploadedBy: 'ettienejvr@gmail.com',
      status: 'Extracted',
      dataSource: 'Manual Extraction'
    };
  }
  
  // For images we haven't manually extracted yet, mark as pending
  return {
    index: index + 1,
    fileName: fileName,
    location: 'Lawley, Gauteng, South Africa',
    address: 'Pending extraction',
    latitude: '',
    longitude: '',
    coordinates: '',
    dateTime: '',
    capturedBy: 'GPS Map Camera',
    uploadedBy: 'ettienejvr@gmail.com',
    status: 'Pending',
    dataSource: 'Needs manual extraction'
  };
}

async function extractRealGPSData() {
  console.log('📍 EXTRACTING REAL GPS DATA FROM IMAGES\n');
  console.log('This process extracts actual data from photo overlays\n');
  
  try {
    // Ensure report directory exists
    await fs.mkdir(REPORT_DIR, { recursive: true });
    
    // Get all JPG files
    const files = await fs.readdir(IMAGE_DIR);
    const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
    
    console.log(`📷 Found ${jpgFiles.length} images to process`);
    console.log(`✅ Real data available for ${Object.keys(realData).length} images\n`);
    
    const allData = [];
    let extractedCount = 0;
    let pendingCount = 0;
    
    // Process each image
    for (let i = 0; i < jpgFiles.length; i++) {
      const fileName = jpgFiles[i];
      
      if ((i + 1) % 50 === 0) {
        console.log(`Processing: ${i + 1}/${jpgFiles.length}`);
      }
      
      const imageData = await processOneImage(fileName, i);
      allData.push(imageData);
      
      if (imageData.status === 'Extracted') {
        extractedCount++;
      } else {
        pendingCount++;
      }
    }
    
    console.log('\n📊 Processing complete!');
    console.log(`✅ Extracted: ${extractedCount} images`);
    console.log(`⏳ Pending: ${pendingCount} images`);
    console.log('\nCreating reports...\n');
    
    // Create CSV file
    const csvFileName = `ettiene-real-gps-data-${new Date().toISOString().split('T')[0]}.csv`;
    const csvPath = path.join(REPORT_DIR, csvFileName);
    
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: 'index', title: 'No.' },
        { id: 'fileName', title: 'File Name' },
        { id: 'location', title: 'Location' },
        { id: 'address', title: 'Full Address' },
        { id: 'latitude', title: 'Latitude' },
        { id: 'longitude', title: 'Longitude' },
        { id: 'coordinates', title: 'GPS Coordinates' },
        { id: 'dateTime', title: 'Date/Time' },
        { id: 'capturedBy', title: 'Captured By' },
        { id: 'uploadedBy', title: 'Uploaded By' },
        { id: 'status', title: 'Status' },
        { id: 'dataSource', title: 'Data Source' }
      ]
    });
    
    await csvWriter.writeRecords(allData);
    console.log(`✅ CSV created: ${csvPath}`);
    
    // Create Excel file
    const workbook = new ExcelJS.Workbook();
    
    // Main data sheet
    const mainSheet = workbook.addWorksheet('Real GPS Data');
    mainSheet.columns = [
      { header: 'No.', key: 'index', width: 8 },
      { header: 'File Name', key: 'fileName', width: 35 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Full Address', key: 'address', width: 60 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'GPS Coordinates', key: 'coordinates', width: 25 },
      { header: 'Date/Time', key: 'dateTime', width: 25 },
      { header: 'Captured By', key: 'capturedBy', width: 15 },
      { header: 'Uploaded By', key: 'uploadedBy', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Data Source', key: 'dataSource', width: 20 }
    ];
    
    // Style header
    mainSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    mainSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003399' }
    };
    mainSheet.getRow(1).height = 20;
    
    // Add data with color coding
    allData.forEach((row) => {
      const excelRow = mainSheet.addRow(row);
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
          fgColor: { argb: 'FFFFEECC' }
        };
      }
    });
    
    // Extracted data sheet
    const extractedSheet = workbook.addWorksheet('Extracted Data Only');
    extractedSheet.columns = mainSheet.columns;
    
    // Style header
    extractedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    extractedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    // Add only extracted data
    const extractedData = allData.filter(d => d.status === 'Extracted');
    extractedData.forEach(row => {
      extractedSheet.addRow(row);
    });
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 50 }
    ];
    
    summarySheet.addRows([
      { metric: 'Report Generated', value: new Date().toLocaleString() },
      { metric: 'Total Images', value: allData.length },
      { metric: 'Images with Extracted Data', value: extractedCount },
      { metric: 'Images Pending Extraction', value: pendingCount },
      { metric: 'Extraction Rate', value: `${((extractedCount/allData.length)*100).toFixed(1)}%` },
      { metric: '', value: '' },
      { metric: 'LOCATION', value: 'Lawley, Gauteng, South Africa' },
      { metric: 'Postal Code', value: '1830' },
      { metric: '', value: '' },
      { metric: 'SAMPLE EXTRACTED ADDRESSES', value: '' },
      ...extractedData.slice(0, 5).map(d => ({ metric: d.fileName, value: d.address })),
      { metric: '', value: '' },
      { metric: 'DATA SOURCE', value: 'GPS Map Camera overlay on photos' },
      { metric: 'Extraction Method', value: 'Manual viewing of photo overlays' }
    ]);
    
    summarySheet.getRow(1).font = { bold: true };
    
    // Save Excel
    const excelFileName = `ettiene-real-gps-data-${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelPath = path.join(REPORT_DIR, excelFileName);
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✅ Excel created: ${excelPath}`);
    
    // Create extraction script for remaining images
    const scriptContent = `// Script to continue manual extraction
// View each image and add the GPS data here

const additionalData = {
  // Example format:
  // 'FILENAME.JPG': {
  //   address: 'Street Name, Area, Lawley, Gauteng 1830, South Africa',
  //   latitude: -26.123456,
  //   longitude: 27.123456,
  //   dateTime: '07/23/2025 12:00 PM GMT+02:00'
  // },
  
  // Add extracted data here:
  
};

// To view an image:
// 1. Open: /home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene/FILENAME.JPG
// 2. Read the GPS overlay at the bottom
// 3. Add the data to this script
`;
    
    await fs.writeFile(
      path.join(REPORT_DIR, 'continue-extraction.js'),
      scriptContent
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REAL GPS DATA EXTRACTION REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Total images: ${allData.length}`);
    console.log(`✅ Extracted with real data: ${extractedCount}`);
    console.log(`⏳ Pending extraction: ${pendingCount}`);
    console.log(`📄 CSV Report: ${csvPath}`);
    console.log(`📊 Excel Report: ${excelPath}`);
    console.log('\n💡 The report contains ACTUAL GPS data from photo overlays');
    console.log('📝 To extract remaining images, view them one by one');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

extractRealGPSData();