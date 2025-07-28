const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

// Sample overlay data structure based on what we've seen
const overlayPatterns = {
  location: /Lawley.*?South Africa/,
  address: /[\w\s]+(?:Street|St\.|Road|Rd\.|Crescent|Cres|Avenue|Ave|Drive|Dr\.|Lane|Ln\.|Close|Cl),.*?1830/,
  gps: /Lat\s*([-\d.]+),\s*Long\s*([\d.]+)/,
  dateTime: /\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s*[AP]M\s*GMT[+-]\d{2}:\d{2}/
};

// Manual extraction for images we can view
const manualData = {
  'LEFU9103.JPG': {
    location: 'Lawley, Gauteng, South Africa',
    address: 'Piranha Crescent, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.396490,
    longitude: 27.813118,
    dateTime: '07/23/2025 11:22 AM GMT+02:00'
  },
  'UUZQ0214.JPG': {
    location: 'Lawley, Gauteng, South Africa',
    address: 'Lawley Road, Elandsfontein, Lawley, Gauteng 1830, South Africa',
    latitude: -26.382613,
    longitude: 27.807202,
    dateTime: '07/24/2025 03:14 PM GMT+02:00'
  }
};

async function processLocalImages() {
  console.log('🔍 PROCESSING LOCAL IMAGES FOR GPS DATA\n');
  
  try {
    const folder = './ettiene-images';
    
    // Get all JPG files
    const files = await fs.readdir(folder);
    const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
    
    console.log(`📷 Found ${jpgFiles.length} images to process\n`);
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GPS Data Extraction');
    
    worksheet.columns = [
      { header: 'No.', key: 'index', width: 8 },
      { header: 'File Name', key: 'fileName', width: 35 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Full Address', key: 'address', width: 70 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'GPS Coordinates', key: 'coordinates', width: 25 },
      { header: 'Date/Time', key: 'dateTime', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    
    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003399' }
    };
    
    // Process each image
    let processedCount = 0;
    let withDataCount = 0;
    
    for (let i = 0; i < jpgFiles.length; i++) {
      const fileName = jpgFiles[i];
      console.log(`[${i + 1}/${jpgFiles.length}] Processing ${fileName}...`);
      
      let rowData = {
        index: i + 1,
        fileName: fileName,
        status: 'Needs Manual Review'
      };
      
      // Check if we have manual data
      if (manualData[fileName]) {
        const data = manualData[fileName];
        rowData = {
          ...rowData,
          location: data.location,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          coordinates: `${data.latitude}, ${data.longitude}`,
          dateTime: data.dateTime,
          status: 'Extracted'
        };
        withDataCount++;
        console.log(`   ✅ Data available`);
      } else {
        // For now, we need manual extraction
        rowData = {
          ...rowData,
          location: 'Lawley, Gauteng, South Africa',
          address: 'Manual extraction needed',
          latitude: '',
          longitude: '',
          coordinates: '',
          dateTime: '',
          status: 'Pending'
        };
        console.log(`   ⏳ Manual extraction needed`);
      }
      
      const row = worksheet.addRow(rowData);
      
      // Color code based on status
      if (rowData.status === 'Extracted') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
      } else {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEECC' }
        };
      }
      
      processedCount++;
    }
    
    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 50 }
    ];
    
    summarySheet.addRows([
      { metric: 'Report Date', value: new Date().toLocaleString() },
      { metric: 'Total Images Found', value: jpgFiles.length },
      { metric: 'Images with Extracted Data', value: withDataCount },
      { metric: 'Images Pending Manual Review', value: jpgFiles.length - withDataCount },
      { metric: '', value: '' },
      { metric: 'KEY FINDINGS', value: '' },
      { metric: 'Data Location', value: 'Overlaid on photos (bottom section)' },
      { metric: 'Overlay Type', value: 'GPS Map Camera watermark' },
      { metric: 'Primary Location', value: 'Lawley, Gauteng, South Africa' },
      { metric: '', value: '' },
      { metric: 'Next Steps', value: 'View each image to extract overlay data' }
    ]);
    
    summarySheet.getRow(1).font = { bold: true };
    
    // Instructions sheet
    const instructSheet = workbook.addWorksheet('Instructions');
    instructSheet.columns = [
      { header: 'Instructions for Manual Data Extraction', key: 'instruction', width: 100 }
    ];
    
    instructSheet.addRows([
      { instruction: '1. Open each image file in ettiene-images folder' },
      { instruction: '2. Look at the bottom of the image for GPS Map Camera overlay' },
      { instruction: '3. Extract the following information:' },
      { instruction: '   - Full address (e.g., "Piranha Crescent, Elandsfontein, Lawley, Gauteng 1830")' },
      { instruction: '   - GPS coordinates (e.g., "Lat -26.396490, Long 27.813118")' },
      { instruction: '   - Date and time stamp' },
      { instruction: '4. Update the Excel sheet with the extracted data' },
      { instruction: '' },
      { instruction: 'SAMPLE DATA FROM FIRST TWO IMAGES:' },
      { instruction: 'Image 1: Piranha Crescent, GPS: -26.396490, 27.813118' },
      { instruction: 'Image 2: Lawley Road, GPS: -26.382613, 27.807202' }
    ]);
    
    // Save workbook
    const fileName = `ettiene-gps-extraction-${new Date().toISOString().split('T')[0]}.xlsx`;
    await workbook.xlsx.writeFile(`./reports/${fileName}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 PROCESSING COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📁 Images processed: ${processedCount}`);
    console.log(`✅ With data: ${withDataCount}`);
    console.log(`⏳ Need manual review: ${processedCount - withDataCount}`);
    console.log(`📊 Report saved: ./reports/${fileName}`);
    console.log('\n💡 To extract remaining data:');
    console.log('   1. View images in ettiene-images folder');
    console.log('   2. Read overlay text at bottom of each photo');
    console.log('   3. Update Excel with GPS and address data');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

processLocalImages();