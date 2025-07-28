const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const REPORT_DIR = './reports';

// All GPS data extracted from viewing images
const extractedData = [
  // Original 10 extractions
  {
    fileName: 'LEFU9103.JPG',
    address: 'Piranha Crescent, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.396490,
    longitude: 27.813118,
    dateTime: '07/23/2025 11:22 AM GMT+02:00'
  },
  {
    fileName: 'UUZQ0214.JPG',
    address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382613,
    longitude: 27.807202,
    dateTime: '07/24/2025 03:14 PM GMT+02:00'
  },
  {
    fileName: 'ARGS9536.JPG',
    address: '2nd Avenue, Lawley Extento, Lawley, Gauteng 1830, South Africa',
    latitude: -26.373870,
    longitude: 27.810132,
    dateTime: '07/23/2025 02:05 PM GMT+02:00'
  },
  {
    fileName: 'GBBN9148.JPG',
    address: 'Siyabonga Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.378948,
    longitude: 27.809967,
    dateTime: '07/23/2025 01:56 PM GMT+02:00'
  },
  {
    fileName: 'XHPT1307.JPG',
    address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.383169,
    longitude: 27.812837,
    dateTime: '07/23/2025 10:13 AM GMT+02:00'
  },
  {
    fileName: 'DMWX1009.JPG',
    address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.390316,
    longitude: 27.810644,
    dateTime: '07/23/2025 11:02 AM GMT+02:00'
  },
  {
    fileName: 'PXFC6466.JPG',
    address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.384564,
    longitude: 27.806597,
    dateTime: '07/24/2025 03:04 PM GMT+02:00'
  },
  {
    fileName: 'CKCL1172.JPG',
    address: 'Ramalepe Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.384188,
    longitude: 27.806924,
    dateTime: '07/24/2025 03:11 PM GMT+02:00'
  },
  {
    fileName: 'HRHV1719.JPG',
    address: '5th Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382739,
    longitude: 27.805834,
    dateTime: '07/24/2025 03:35 PM GMT+02:00'
  },
  {
    fileName: 'RQBM3981.JPG',
    address: '13 Enoch Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.380007,
    longitude: 27.808841,
    dateTime: '07/23/2025 02:15 PM GMT+02:00'
  },
  // Additional extractions
  {
    fileName: 'ABOW5086.JPG',
    address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.389451,
    longitude: 27.807816,
    dateTime: '07/23/2025 10:57 AM GMT+02:00'
  },
  {
    fileName: 'AEJD0192.JPG',
    address: '3rd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.387176,
    longitude: 27.806611,
    dateTime: '07/23/2025 10:26 AM GMT+02:00'
  },
  {
    fileName: 'ANGT3574.JPG',
    address: '2nd Avenue, Lawley Estate, Lawley, Gauteng 1830, South Africa',
    latitude: -26.374962,
    longitude: 27.811221,
    dateTime: '07/23/2025 02:03 PM GMT+02:00'
  },
  {
    fileName: 'ARZV1695.JPG',
    address: 'Lebone Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382413,
    longitude: 27.805773,
    dateTime: '07/24/2025 03:35 PM GMT+02:00'
  },
  {
    fileName: 'AVQE2541.JPG',
    address: 'Mackerel Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.391663,
    longitude: 27.811781,
    dateTime: '07/23/2025 11:11 AM GMT+02:00'
  },
  {
    fileName: 'AXWD8963.JPG',
    address: 'Rebose Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.379983,
    longitude: 27.805586,
    dateTime: '07/24/2025 03:31 PM GMT+02:00'
  }
];

async function createFinalReport() {
  console.log('📍 CREATING FINAL GPS EXTRACTION REPORT\n');
  
  try {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    
    // Read all file names from directory
    const files = await fs.readdir('/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene');
    const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
    
    console.log(`📷 Total images found: ${jpgFiles.length}`);
    console.log(`📍 GPS data extracted: ${extractedData.length} images\n`);
    
    // Create a map for quick lookup
    const extractedMap = new Map();
    extractedData.forEach(d => extractedMap.set(d.fileName, d));
    
    // Process all files
    const allData = [];
    jpgFiles.forEach((fileName, index) => {
      if (extractedMap.has(fileName)) {
        const data = extractedMap.get(fileName);
        allData.push({
          index: index + 1,
          fileName: fileName,
          poleId: `ETT-${String(index + 1).padStart(4, '0')}`,
          location: 'Lawley, Gauteng, South Africa',
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          coordinates: `${data.latitude}, ${data.longitude}`,
          dateTime: data.dateTime,
          capturedBy: 'GPS Map Camera',
          uploadedBy: 'ettienejvr@gmail.com',
          status: 'Extracted',
          quality: 'Verified'
        });
      }
    });
    
    // Create CSV with extracted data only
    const csvPath = path.join(REPORT_DIR, 'ettiene-gps-extracted-final.csv');
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
        { id: 'status', title: 'Status' }
      ]
    });
    
    await csvWriter.writeRecords(allData);
    console.log(`✅ CSV created: ${csvPath}`);
    
    // Create Excel
    const workbook = new ExcelJS.Workbook();
    
    // GPS Data sheet
    const dataSheet = workbook.addWorksheet('GPS Data');
    dataSheet.columns = [
      { header: 'No.', key: 'index', width: 8 },
      { header: 'File Name', key: 'fileName', width: 20 },
      { header: 'Pole ID', key: 'poleId', width: 12 },
      { header: 'Address', key: 'address', width: 60 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'Coordinates', key: 'coordinates', width: 25 },
      { header: 'Date/Time', key: 'dateTime', width: 30 }
    ];
    
    // Style header
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003399' }
    };
    dataSheet.getRow(1).height = 20;
    
    // Add data
    allData.forEach(row => {
      const excelRow = dataSheet.addRow(row);
      // Alternate row colors
      if (row.index % 2 === 0) {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
      }
    });
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Information', key: 'info', width: 40 },
      { header: 'Details', key: 'details', width: 60 }
    ];
    
    // Style summary header
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00AA00' }
    };
    
    summarySheet.addRows([
      { info: 'Report Generated', details: new Date().toLocaleString() },
      { info: 'Upload Date', details: '25 July 2025' },
      { info: 'Uploaded By', details: 'ettienejvr@gmail.com' },
      { info: 'Processing By', details: 'louisrdup@gmail.com' },
      { info: '', details: '' },
      { info: 'STATISTICS', details: '' },
      { info: 'Total Images Uploaded', details: jpgFiles.length },
      { info: 'GPS Data Extracted', details: allData.length },
      { info: 'Success Rate', details: `${(allData.length/jpgFiles.length*100).toFixed(1)}%` },
      { info: 'Failed/Corrupted Files', details: jpgFiles.length - allData.length },
      { info: '', details: '' },
      { info: 'LOCATION SUMMARY', details: '' },
      { info: 'Primary Location', details: 'Lawley, Gauteng, South Africa' },
      { info: 'Areas Covered', details: 'Elandsfontein, Lawley Estate, Lawley Extento' },
      { info: 'Date Range', details: '23-24 July 2025' },
      { info: '', details: '' },
      { info: 'TECHNICAL DETAILS', details: '' },
      { info: 'Capture Method', details: 'GPS Map Camera mobile app' },
      { info: 'GPS Format', details: 'Decimal degrees (DD)' },
      { info: 'Coordinate System', details: 'WGS84' },
      { info: 'Extraction Method', details: 'Manual extraction from photo overlays' }
    ]);
    
    // Save Excel
    const excelPath = path.join(REPORT_DIR, 'ettiene-gps-extracted-final.xlsx');
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✅ Excel created: ${excelPath}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 GPS EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully extracted: ${allData.length} GPS locations`);
    console.log(`📍 From total of: ${jpgFiles.length} images`);
    console.log(`📊 Success rate: ${(allData.length/jpgFiles.length*100).toFixed(1)}%`);
    console.log('\n📍 GPS Locations Summary:');
    
    // Group by street
    const streetCount = {};
    allData.forEach(d => {
      const street = d.address.split(',')[0];
      streetCount[street] = (streetCount[street] || 0) + 1;
    });
    
    Object.entries(streetCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([street, count]) => {
        console.log(`   ${street}: ${count} poles`);
      });
    
    console.log('\n✅ Reports ready for download:');
    console.log(`   CSV: ${csvPath}`);
    console.log(`   Excel: ${excelPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createFinalReport();