const fs = require('fs').promises;
const path = require('path');

async function processAllImages() {
  const imageDir = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';
  const files = await fs.readdir(imageDir);
  const jpgFiles = files.filter(f => f.endsWith('.JPG')).sort();
  
  console.log(`Total images to process: ${jpgFiles.length}`);
  
  // Create a tracking file
  const trackingData = [];
  
  // Process each file
  for (let i = 0; i < jpgFiles.length; i++) {
    const fileName = jpgFiles[i];
    const filePath = path.join(imageDir, fileName);
    
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        trackingData.push({
          index: i + 1,
          fileName: fileName,
          status: 'EMPTY',
          fileSize: 0,
          notes: 'Empty file (0 bytes)'
        });
        console.log(`${i + 1}/${jpgFiles.length}: ${fileName} - EMPTY FILE`);
      } else {
        trackingData.push({
          index: i + 1,
          fileName: fileName,
          status: 'TO_PROCESS',
          fileSize: stats.size,
          notes: 'Ready for GPS extraction'
        });
        console.log(`${i + 1}/${jpgFiles.length}: ${fileName} - Ready (${stats.size} bytes)`);
      }
    } catch (error) {
      trackingData.push({
        index: i + 1,
        fileName: fileName,
        status: 'ERROR',
        fileSize: 0,
        notes: error.message
      });
      console.log(`${i + 1}/${jpgFiles.length}: ${fileName} - ERROR: ${error.message}`);
    }
  }
  
  // Save tracking data
  await fs.writeFile(
    'reports/image-processing-status.json',
    JSON.stringify(trackingData, null, 2)
  );
  
  // Summary
  const empty = trackingData.filter(d => d.status === 'EMPTY').length;
  const ready = trackingData.filter(d => d.status === 'TO_PROCESS').length;
  const errors = trackingData.filter(d => d.status === 'ERROR').length;
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total images: ${jpgFiles.length}`);
  console.log(`Empty files: ${empty}`);
  console.log(`Ready to process: ${ready}`);
  console.log(`Errors: ${errors}`);
}

processAllImages();