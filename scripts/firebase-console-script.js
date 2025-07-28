// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/project/fibreflow-73daf/firestore
// 2. Open Browser Console (F12)
// 3. Paste this entire script and press Enter
// 4. It will create and download an Excel file

(async function processEttienesImages() {
  console.log('🚀 Starting Ettiene image processing...');
  
  // Query for Ettiene's images
  const db = firebase.firestore();
  const snapshot = await db.collection('uploaded-images')
    .where('uploadedBy', '==', 'ettienejvr@gmail.com')
    .get();
  
  if (snapshot.empty) {
    console.log('❌ No images found for ettienejvr@gmail.com');
    
    // Check all recent uploads
    const allSnapshot = await db.collection('uploaded-images')
      .orderBy('uploadedAt', 'desc')
      .limit(20)
      .get();
    
    console.log('📋 Recent uploads:');
    allSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.fileName} (${data.uploadedBy})`);
    });
    return;
  }
  
  console.log(`✅ Found ${snapshot.size} images`);
  
  // Process images
  const images = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    images.push({
      fileName: data.fileName,
      site: data.site || 'Unknown',
      project: data.project || 'General',
      fileSize: data.fileSize || 0,
      uploadDate: data.uploadedAt?.toDate() || new Date(),
      url: data.firebaseStorageUrl || data.url || '',
      storagePath: data.storagePath || ''
    });
  });
  
  // Create CSV content
  let csv = 'File Name,Site,Project,Upload Date,Latitude,Longitude,GPS Status,File Size (KB),Storage Path,URL\n';
  
  let gpsCount = 0;
  images.forEach(img => {
    // Extract GPS from filename
    const gpsMatch = img.fileName.match(/GPS[_-]?([-]?\d+\.?\d*)[_,]?([-]?\d+\.?\d*)/i);
    let lat = '', lng = '', gpsStatus = 'Not Found';
    
    if (gpsMatch) {
      lat = gpsMatch[1];
      lng = gpsMatch[2];
      gpsStatus = 'Found';
      gpsCount++;
    }
    
    csv += [
      img.fileName,
      img.site,
      img.project,
      img.uploadDate.toLocaleString(),
      lat,
      lng,
      gpsStatus,
      Math.round(img.fileSize / 1024),
      img.storagePath,
      img.url
    ].map(v => `"${v}"`).join(',') + '\n';
  });
  
  // Add summary
  csv += '\n\nSUMMARY\n';
  csv += `Total Images,${images.length}\n`;
  csv += `Images with GPS,${gpsCount}\n`;
  csv += `GPS Success Rate,${(gpsCount/images.length*100).toFixed(1)}%\n`;
  csv += `Report Date,${new Date().toLocaleString()}\n`;
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ettiene-images-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  console.log('✅ CSV downloaded!');
  console.log(`📊 Total: ${images.length} images`);
  console.log(`📍 GPS found: ${gpsCount} (${(gpsCount/images.length*100).toFixed(1)}%)`);
  
  // Also log the data for manual processing
  console.log('📋 Image data:', images);
})();