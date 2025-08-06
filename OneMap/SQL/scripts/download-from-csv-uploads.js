const https = require('https');
const fs = require('fs');
const path = require('path');

// Firebase Storage URL - file is in csv-uploads folder
const fileName = '1754473447790_Lawley_01082025.xlsx';
const storagePath = `csv-uploads/${fileName}`;
const encodedPath = encodeURIComponent(storagePath);
const fileUrl = `https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/${encodedPath}?alt=media`;
const downloadPath = path.join(__dirname, '../data/excel/', fileName);

console.log('Downloading Excel file from Firebase Storage...');
console.log('Storage path:', storagePath);
console.log('Full URL:', fileUrl);
console.log('Saving to:', downloadPath);

// Ensure directory exists
const dir = path.dirname(downloadPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Download file
const file = fs.createWriteStream(downloadPath);

https.get(fileUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error('Download failed. Status:', response.statusCode);
    return;
  }

  const totalSize = parseInt(response.headers['content-length'], 10);
  let downloadedSize = 0;

  response.on('data', (chunk) => {
    downloadedSize += chunk.length;
    const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${progress}%`);
  });

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('\n✓ Download completed successfully!');
    console.log('File saved to:', downloadPath);
    console.log('File size:', fs.statSync(downloadPath).size, 'bytes');
  });
}).on('error', (err) => {
  fs.unlink(downloadPath, () => {}); // Delete the file on error
  console.error('Download error:', err.message);
});