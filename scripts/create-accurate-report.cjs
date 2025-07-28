const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const IMAGE_DIR = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';
const REPORT_DIR = './reports';

// Real data extracted from actual images
const verifiedData = {
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
  },
  'CKCL1172.JPG': {
    address: 'Ramalepe Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.384188,
    longitude: 27.806924,
    dateTime: '07/24/2025 03:11 PM GMT+02:00'
  },
  'HRHV1719.JPG': {
    address: '5th Avenue, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382739,
    longitude: 27.805834,
    dateTime: '07/24/2025 03:35 PM GMT+02:00'
  },
  'RQBM3981.JPG': {
    address: '13 Enoch Street, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.380007,
    longitude: 27.808841,
    dateTime: '07/23/2025 02:15 PM GMT+02:00'
  }
};

async function createAccurateReport() {
  console.log('📍 CREATING ACCURATE GPS REPORT WITH VERIFIED DATA\n');
  
  try {
    await fs.mkdir(REPORT_DIR, { recursive: true });
    
    const files = await fs.readdir(IMAGE_DIR);
    const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
    
    console.log(`📷 Total images: ${jpgFiles.length}`);
    console.log(`✅ Verified data: ${Object.keys(verifiedData).length} images\n`);
    
    const allData = [];
    
    // Process all images
    jpgFiles.forEach((fileName, index) => {
      if (verifiedData[fileName]) {
        // Use verified data
        const data = verifiedData[fileName];
        allData.push({
          index: index + 1,
          fileName: fileName,
          location: 'Lawley, Gauteng, South Africa',
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          coordinates: `${data.latitude}, ${data.longitude}`,
          dateTime: data.dateTime,
          capturedBy: 'GPS Map Camera',
          uploadedBy: 'ettienejvr@gmail.com',
          status: 'Verified',
          poleId: `ETT-${String(index + 1).padStart(4, '0')}`
        });
      } else {
        // Mark as unverified - needs manual extraction
        allData.push({
          index: index + 1,
          fileName: fileName,
          location: 'Lawley, Gauteng, South Africa',
          address: 'Requires manual extraction from photo',
          latitude: '',
          longitude: '',
          coordinates: '',
          dateTime: '',
          capturedBy: 'GPS Map Camera',
          uploadedBy: 'ettienejvr@gmail.com',
          status: 'Unverified',
          poleId: `ETT-${String(index + 1).padStart(4, '0')}`
        });
      }
    });
    
    // Create CSV
    const csvPath = path.join(REPORT_DIR, 'ettiene-verified-gps-data.csv');
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
        { id: 'status', title: 'Verification Status' }
      ]
    });
    
    await csvWriter.writeRecords(allData);
    console.log(`✅ CSV created: ${csvPath}`);
    
    // Create Excel
    const workbook = new ExcelJS.Workbook();
    
    // Verified data sheet
    const verifiedSheet = workbook.addWorksheet('Verified GPS Data');
    verifiedSheet.columns = [
      { header: 'No.', key: 'index', width: 8 },
      { header: 'File Name', key: 'fileName', width: 20 },
      { header: 'Pole ID', key: 'poleId', width: 12 },
      { header: 'Address', key: 'address', width: 60 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Coordinates', key: 'coordinates', width: 25 },
      { header: 'Date/Time', key: 'dateTime', width: 25 }
    ];
    
    // Style header
    verifiedSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    verifiedSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003399' }
    };
    
    // Add verified data only
    const verifiedRows = allData.filter(d => d.status === 'Verified');
    verifiedRows.forEach(row => {
      const excelRow = verifiedSheet.addRow(row);
      excelRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCFFCC' }
      };
    });
    
    // All data sheet
    const allDataSheet = workbook.addWorksheet('All Images');
    allDataSheet.columns = verifiedSheet.columns;
    allDataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    allDataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    allData.forEach(row => {
      const excelRow = allDataSheet.addRow(row);
      if (row.status === 'Verified') {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
      }
    });
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Information', key: 'info', width: 40 },
      { header: 'Details', key: 'details', width: 60 }
    ];
    
    summarySheet.addRows([
      { info: 'Report Date', details: new Date().toLocaleString() },
      { info: 'Total Images', details: jpgFiles.length },
      { info: 'Verified GPS Data', details: verifiedRows.length },
      { info: 'Pending Verification', details: jpgFiles.length - verifiedRows.length },
      { info: 'Verification Rate', details: `${(verifiedRows.length/jpgFiles.length*100).toFixed(1)}%` },
      { info: '', details: '' },
      { info: 'VERIFIED LOCATIONS', details: '' },
      ...verifiedRows.slice(0, 10).map(d => ({
        info: d.fileName,
        details: `${d.address.split(',')[0]} (${d.latitude}, ${d.longitude})`
      })),
      { info: '', details: '' },
      { info: 'DATA SOURCE', details: 'GPS Map Camera overlay on photos' },
      { info: 'Verification Method', details: 'Manual extraction from photo overlays' }
    ]);
    
    summarySheet.getRow(1).font = { bold: true };
    
    // Save Excel
    const excelPath = path.join(REPORT_DIR, 'ettiene-verified-gps-data.xlsx');
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✅ Excel created: ${excelPath}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ACCURATE GPS REPORT CREATED');
    console.log('='.repeat(60));
    console.log(`✅ Verified entries: ${verifiedRows.length}`);
    console.log(`⏳ Unverified entries: ${jpgFiles.length - verifiedRows.length}`);
    console.log('\n📍 Sample verified addresses:');
    verifiedRows.slice(0, 5).forEach(d => {
      console.log(`   ${d.address.split(',')[0]} - GPS: ${d.coordinates}`);
    });
    console.log('\n💡 This report contains ACTUAL GPS data from photos!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAccurateReport();