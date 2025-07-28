const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// All GPS data extracted so far
const extractedGPSData = [
  { index: 2, fileName: 'ABOW5086.JPG', address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.389451, longitude: 27.807816, dateTime: '07/23/2025 10:57 AM GMT+02:00' },
  { index: 3, fileName: 'AEJD0192.JPG', address: '3rd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.387176, longitude: 27.806611, dateTime: '07/23/2025 10:26 AM GMT+02:00' },
  { index: 7, fileName: 'ANGT3574.JPG', address: '2nd Avenue, Lawley Estate, Lawley, Gauteng 1830, South Africa', latitude: -26.374962, longitude: 27.811221, dateTime: '07/23/2025 02:03 PM GMT+02:00' },
  { index: 10, fileName: 'ARGS9536.JPG', address: '2nd Avenue, Lawley Extento, Lawley, Gauteng 1830, South Africa', latitude: -26.373870, longitude: 27.810132, dateTime: '07/23/2025 02:05 PM GMT+02:00' },
  { index: 11, fileName: 'ARZV1695.JPG', address: 'Lebone Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.382413, longitude: 27.805773, dateTime: '07/24/2025 03:35 PM GMT+02:00' },
  { index: 13, fileName: 'AVQE2541.JPG', address: 'Mackerel Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.391663, longitude: 27.811781, dateTime: '07/23/2025 11:11 AM GMT+02:00' },
  { index: 14, fileName: 'AXWD8963.JPG', address: 'Rebose Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.379983, longitude: 27.805586, dateTime: '07/24/2025 03:31 PM GMT+02:00' },
  { index: 18, fileName: 'BIZJ8490.JPG', address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.381851, longitude: 27.812077, dateTime: '07/24/2025 03:22 PM GMT+02:00' },
  { index: 19, fileName: 'BMCZ3397.JPG', address: '3rd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.386286, longitude: 27.806431, dateTime: '07/23/2025 10:25 AM GMT+02:00' },
  { index: 20, fileName: 'BMES8191.JPG', address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.382283, longitude: 27.809114, dateTime: '07/24/2025 03:19 PM GMT+02:00' },
  { index: 29, fileName: 'CCHC6189.JPG', address: '7 Siyabonga Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.383869, longitude: 27.806789, dateTime: '07/24/2025 03:05 PM GMT+02:00' },
  { index: 31, fileName: 'CHXX4480.JPG', address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.377331, longitude: 27.811650, dateTime: '07/23/2025 02:00 PM GMT+02:00' },
  { index: 32, fileName: 'CIFN6820.JPG', address: '3rd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.385886, longitude: 27.809345, dateTime: '07/23/2025 10:20 AM GMT+02:00' },
  { index: 33, fileName: 'CKCL1172.JPG', address: 'Ramalepe Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.384188, longitude: 27.806924, dateTime: '07/24/2025 03:11 PM GMT+02:00' },
  { index: 35, fileName: 'CNPR3546.JPG', address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.380441, longitude: 27.812265, dateTime: '07/23/2025 02:20 PM GMT+02:00' },
  { index: 36, fileName: 'CPIY3449.JPG', address: 'Mousebird Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.383938, longitude: 27.806062, dateTime: '07/24/2025 03:12 PM GMT+02:00' },
  { index: 39, fileName: 'CUZE5708.JPG', address: '5th Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.382996, longitude: 27.806075, dateTime: '07/24/2025 03:35 PM GMT+02:00' },
  { index: 40, fileName: 'CVYD6786.JPG', address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.382097, longitude: 27.810432, dateTime: '07/24/2025 03:20 PM GMT+02:00' },
  { index: 42, fileName: 'DIVV9861.JPG', address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.383321, longitude: 27.812880, dateTime: '07/23/2025 10:14 AM GMT+02:00' },
  { index: 44, fileName: 'DMWX1009.JPG', address: 'Barracuda Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.390316, longitude: 27.810644, dateTime: '07/23/2025 11:02 AM GMT+02:00' },
  { index: 75, fileName: 'GBBN9148.JPG', address: 'Siyabonga Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.378948, longitude: 27.809967, dateTime: '07/23/2025 01:56 PM GMT+02:00' },
  { index: 92, fileName: 'HRHV1719.JPG', address: '5th Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.382739, longitude: 27.805834, dateTime: '07/24/2025 03:35 PM GMT+02:00' },
  { index: 140, fileName: 'LEFU9103.JPG', address: 'Piranha Crescent, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.396490, longitude: 27.813118, dateTime: '07/23/2025 11:22 AM GMT+02:00' },
  { index: 187, fileName: 'PXFC6466.JPG', address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.384564, longitude: 27.806597, dateTime: '07/24/2025 03:04 PM GMT+02:00' },
  { index: 214, fileName: 'RQBM3981.JPG', address: '13 Enoch Street, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.380007, longitude: 27.808841, dateTime: '07/23/2025 02:15 PM GMT+02:00' },
  { index: 256, fileName: 'UUZQ0214.JPG', address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.382613, longitude: 27.807202, dateTime: '07/24/2025 03:14 PM GMT+02:00' },
  { index: 269, fileName: 'XHPT1307.JPG', address: '2nd Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa', latitude: -26.383169, longitude: 27.812837, dateTime: '07/23/2025 10:13 AM GMT+02:00' }
];

// Known problematic files
const fileIssues = {
  1: 'CORRUPTED', 4: 'EMPTY', 5: 'EMPTY', 6: 'EMPTY', 8: 'CORRUPTED', 9: 'EMPTY',
  12: 'CORRUPTED', 15: 'EMPTY', 16: 'EMPTY', 17: 'CORRUPTED', 21: 'EMPTY', 22: 'EMPTY',
  23: 'EMPTY', 24: 'EMPTY', 25: 'EMPTY', 26: 'EMPTY', 27: 'EMPTY', 28: 'EMPTY',
  30: 'EMPTY', 34: 'EMPTY', 37: 'CORRUPTED', 38: 'EMPTY', 41: 'EMPTY', 46: 'EMPTY',
  48: 'EMPTY', 50: 'EMPTY'
};

async function createUpdatedReport() {
  console.log('📍 CREATING UPDATED GPS EXTRACTION REPORT\n');
  
  const imageDir = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';
  const files = await fs.readdir(imageDir);
  const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
  
  // Create map for quick lookup
  const extractedMap = new Map();
  extractedGPSData.forEach(d => extractedMap.set(d.index, d));
  
  // Process all 278 files
  const allData = [];
  jpgFiles.forEach((fileName, idx) => {
    const index = idx + 1;
    
    if (extractedMap.has(index)) {
      // GPS extracted
      const data = extractedMap.get(index);
      allData.push({
        index: index,
        fileName: fileName,
        poleId: `ETT-${String(index).padStart(4, '0')}`,
        status: 'EXTRACTED',
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        coordinates: `${data.latitude}, ${data.longitude}`,
        dateTime: data.dateTime,
        notes: ''
      });
    } else if (fileIssues[index]) {
      // Known issue
      allData.push({
        index: index,
        fileName: fileName,
        poleId: `ETT-${String(index).padStart(4, '0')}`,
        status: fileIssues[index],
        address: '',
        latitude: '',
        longitude: '',
        coordinates: '',
        dateTime: '',
        notes: fileIssues[index] === 'EMPTY' ? '0 bytes file' : 'Cannot read - corrupted'
      });
    } else {
      // Not yet processed
      allData.push({
        index: index,
        fileName: fileName,
        poleId: `ETT-${String(index).padStart(4, '0')}`,
        status: 'PENDING',
        address: '',
        latitude: '',
        longitude: '',
        coordinates: '',
        dateTime: '',
        notes: 'To be processed'
      });
    }
  });
  
  // Create reports directory
  const REPORT_DIR = './reports';
  await fs.mkdir(REPORT_DIR, { recursive: true });
  
  // Create CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const csvPath = path.join(REPORT_DIR, `ettiene-gps-update-${timestamp}.csv`);
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'index', title: 'No.' },
      { id: 'fileName', title: 'File Name' },
      { id: 'poleId', title: 'Pole ID' },
      { id: 'status', title: 'Status' },
      { id: 'address', title: 'Full Address' },
      { id: 'latitude', title: 'Latitude' },
      { id: 'longitude', title: 'Longitude' },
      { id: 'coordinates', title: 'GPS Coordinates' },
      { id: 'dateTime', title: 'Date/Time' },
      { id: 'notes', title: 'Notes' }
    ]
  });
  
  await csvWriter.writeRecords(allData);
  
  // Create Excel
  const workbook = new ExcelJS.Workbook();
  
  // All Images Sheet
  const allSheet = workbook.addWorksheet('All 278 Images');
  allSheet.columns = [
    { header: 'No.', key: 'index', width: 8 },
    { header: 'File Name', key: 'fileName', width: 20 },
    { header: 'Pole ID', key: 'poleId', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Address', key: 'address', width: 60 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Coordinates', key: 'coordinates', width: 25 },
    { header: 'Date/Time', key: 'dateTime', width: 30 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];
  
  // Style header
  allSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  allSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003399' }
  };
  
  // Add data with conditional formatting
  allData.forEach(row => {
    const excelRow = allSheet.addRow(row);
    if (row.status === 'EXTRACTED') {
      excelRow.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00FF00' }
      };
    } else if (row.status === 'EMPTY') {
      excelRow.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF9900' }
      };
    } else if (row.status === 'CORRUPTED') {
      excelRow.getCell('status').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF0000' }
      };
    }
  });
  
  // Extracted GPS Sheet
  const gpsSheet = workbook.addWorksheet('Extracted GPS Data');
  gpsSheet.columns = allSheet.columns;
  gpsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  gpsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF00AA00' }
  };
  
  const extractedOnly = allData.filter(d => d.status === 'EXTRACTED');
  extractedOnly.forEach(row => {
    gpsSheet.addRow(row);
  });
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Information', key: 'info', width: 40 },
    { header: 'Details', key: 'details', width: 60 }
  ];
  
  const extracted = allData.filter(d => d.status === 'EXTRACTED').length;
  const empty = allData.filter(d => d.status === 'EMPTY').length;
  const corrupted = allData.filter(d => d.status === 'CORRUPTED').length;
  const pending = allData.filter(d => d.status === 'PENDING').length;
  
  // Group by street
  const streetCount = {};
  extractedOnly.forEach(d => {
    const street = d.address.split(',')[0];
    streetCount[street] = (streetCount[street] || 0) + 1;
  });
  
  summarySheet.addRows([
    { info: 'Report Updated', details: new Date().toLocaleString() },
    { info: 'Total Images', details: jpgFiles.length },
    { info: '', details: '' },
    { info: 'EXTRACTION PROGRESS', details: '' },
    { info: 'GPS Data Extracted', details: `${extracted} (${(extracted/jpgFiles.length*100).toFixed(1)}%)` },
    { info: 'Empty Files (0 bytes)', details: `${empty}` },
    { info: 'Corrupted Files', details: `${corrupted}` },
    { info: 'Pending Processing', details: `${pending}` },
    { info: '', details: '' },
    { info: 'STREETS COVERED', details: '' },
    ...Object.entries(streetCount)
      .sort((a, b) => b[1] - a[1])
      .map(([street, count]) => ({ info: street, details: `${count} poles` })),
    { info: '', details: '' },
    { info: 'UPLOAD DETAILS', details: '' },
    { info: 'Uploaded By', details: 'ettienejvr@gmail.com' },
    { info: 'Upload Date', details: '25 July 2025' },
    { info: 'Processing By', details: 'louisrdup@gmail.com' }
  ]);
  
  summarySheet.getRow(1).font = { bold: true };
  
  const excelPath = path.join(REPORT_DIR, `ettiene-gps-update-${timestamp}.xlsx`);
  await workbook.xlsx.writeFile(excelPath);
  
  // Progress Report
  console.log('='.repeat(60));
  console.log('📊 GPS EXTRACTION PROGRESS UPDATE');
  console.log('='.repeat(60));
  console.log(`✅ GPS Extracted: ${extracted} images (${(extracted/jpgFiles.length*100).toFixed(1)}%)`);
  console.log(`⚠️  Empty Files: ${empty}`);
  console.log(`❌ Corrupted: ${corrupted}`);
  console.log(`⏳ Pending: ${pending}`);
  console.log(`📷 TOTAL: ${jpgFiles.length} images`);
  console.log('\n📍 Streets with GPS data:');
  Object.entries(streetCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([street, count]) => {
      console.log(`   ${street}: ${count} poles`);
    });
  console.log('\n✅ Reports saved:');
  console.log(`   CSV: ${csvPath}`);
  console.log(`   Excel: ${excelPath}`);
}

createUpdatedReport();