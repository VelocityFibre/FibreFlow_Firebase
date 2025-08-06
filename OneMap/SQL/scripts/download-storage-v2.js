const https = require('https');
const fs = require('fs');
const path = require('path');

// Firebase Storage URL - need to encode the filename
const fileName = '1754473447790_Lawley_01082025.xlsx';
const encodedFileName = encodeURIComponent(fileName);
const fileUrl = `https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/${encodedFileName}?alt=media`;
const downloadPath = path.join(__dirname, '../data/excel/', fileName);

console.log('Downloading Excel file from Firebase Storage...');
console.log('Encoded URL:', fileUrl);
console.log('Saving to:', downloadPath);

// Ensure directory exists
const dir = path.dirname(downloadPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Download file
const file = fs.createWriteStream(downloadPath);

https.get(fileUrl, (response) => {
  console.log('Response status:', response.statusCode);
  console.log('Response headers:', response.headers);
  
  if (response.statusCode !== 200) {
    console.error('Download failed. Status:', response.statusCode);
    console.error('Response:', response.statusMessage);
    
    // Try to read error response
    let errorBody = '';
    response.on('data', chunk => errorBody += chunk);
    response.on('end', () => {
      console.error('Error body:', errorBody);
    });
    return;
  }

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('✓ Download completed successfully!');
    console.log('File saved to:', downloadPath);
    console.log('File size:', fs.statSync(downloadPath).size, 'bytes');
  });
}).on('error', (err) => {
  fs.unlink(downloadPath, () => {}); // Delete the file on error
  console.error('Download error:', err.message);
});