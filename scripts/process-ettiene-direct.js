const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Since we can't directly access Firestore from here, let me create a script
// that processes the data once you provide it

// For now, let's create the Excel processing function
async function createExcelFromData(imageData) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ettiene Pole Photos');
  
  // Define columns
  worksheet.columns = [
    { header: 'File Name', key: 'fileName', width: 40 },
    { header: 'Site', key: 'site', width: 20 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Upload Date', key: 'uploadDate', width: 20 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'GPS Coordinates', key: 'coordinates', width: 30 },
    { header: 'Address', key: 'address', width: 50 },
    { header: 'File Size (KB)', key: 'fileSize', width: 15 },
    { header: 'GPS Status', key: 'gpsStatus', width: 15 },
    { header: 'Image URL', key: 'imageUrl', width: 80 }
  ];
  
  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  let gpsFoundCount = 0;
  
  // Add data
  imageData.forEach((image, index) => {
    // Extract GPS from filename
    const gps = extractGPS(image.fileName);
    if (gps) gpsFoundCount++;
    
    const row = worksheet.addRow({
      fileName: image.fileName,
      site: image.site || 'Unknown',
      project: image.project || 'General',
      uploadDate: image.uploadDate || new Date().toLocaleDateString(),
      latitude: gps?.latitude || '',
      longitude: gps?.longitude || '',
      coordinates: gps ? `${gps.latitude}, ${gps.longitude}` : '',
      address: gps ? `Near ${image.site || 'location'}` : '',
      fileSize: Math.round((image.fileSize || 0) / 1024),
      gpsStatus: gps ? 'Found' : 'Not Found',
      imageUrl: image.url || ''
    });
    
    // Color code rows
    if (gps) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCFFCC' } // Light green
      };
    }
  });
  
  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  summarySheet.addRows([
    { metric: 'Total Images', value: imageData.length },
    { metric: 'Images with GPS', value: gpsFoundCount },
    { metric: 'Images without GPS', value: imageData.length - gpsFoundCount },
    { metric: 'GPS Success Rate', value: `${(gpsFoundCount / imageData.length * 100).toFixed(1)}%` },
    { metric: 'Report Date', value: new Date().toLocaleDateString() },
    { metric: 'User', value: 'ettienejvr@gmail.com' }
  ]);
  
  summarySheet.getRow(1).font = { bold: true };
  
  // Save file
  const fileName = `ettiene-pole-photos-${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(fileName);
  
  console.log(`✅ Excel file created: ${fileName}`);
  console.log(`📊 Total images: ${imageData.length}`);
  console.log(`📍 Images with GPS: ${gpsFoundCount}`);
  
  return fileName;
}

function extractGPS(fileName) {
  // GPS Map Camera pattern: IMG_GPS_-26.1234_28.5678.jpg
  const gpsPattern = /GPS[_-]?([-]?\d+\.?\d*)[_,]?([-]?\d+\.?\d*)/i;
  const match = fileName.match(gpsPattern);
  
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2])
    };
  }
  
  // Try coordinate pattern
  const coordPattern = /([-]?\d{1,2}\.\d{4,})[_,\s]+([-]?\d{1,3}\.\d{4,})/;
  const coordMatch = fileName.match(coordPattern);
  
  if (coordMatch) {
    return {
      latitude: parseFloat(coordMatch[1]),
      longitude: parseFloat(coordMatch[2])
    };
  }
  
  return null;
}

// SAMPLE DATA - Replace this with actual Firestore data
const sampleData = [
  {
    fileName: 'IMG_GPS_-26.1234_28.5678.jpg',
    site: 'Lawley',
    project: 'Fiber Phase 2',
    fileSize: 2048000,
    uploadDate: new Date().toLocaleDateString(),
    url: 'https://firebasestorage.googleapis.com/...'
  },
  // Add more images here from Firestore
];

// To run this script with real data:
// 1. Export data from Firestore using Firebase Console
// 2. Or use the Firebase Admin SDK with service account
// 3. Pass the data array to createExcelFromData()

// For testing with sample data:
createExcelFromData(sampleData)
  .then(() => console.log('✅ Done!'))
  .catch(console.error);

module.exports = { createExcelFromData, extractGPS };