const https = require('https');
const fs = require('fs');
const path = require('path');

// The file is in Google Cloud Storage
// gs://fibreflow-73daf.firebasestorage.app/csv-uploads/1754473447790_Lawley_01082025.xlsx
// This translates to the following HTTPS URL:

const fileName = '1754473447790_Lawley_01082025.xlsx';
const bucketPath = 'csv-uploads%2F' + fileName;
const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/${bucketPath}?alt=media`;

const outputPath = path.join(__dirname, '../data/excel/', fileName);

console.log('Downloading from Google Cloud Storage...');
console.log('GCS Path: gs://fibreflow-73daf.firebasestorage.app/csv-uploads/' + fileName);
console.log('HTTP URL:', downloadUrl);
console.log('Saving to:', outputPath);

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Download the file
const file = fs.createWriteStream(outputPath);

https.get(downloadUrl, (response) => {
  console.log('Response Status:', response.statusCode);
  console.log('Content-Type:', response.headers['content-type']);
  console.log('Content-Length:', response.headers['content-length']);
  
  if (response.statusCode === 200) {
    response.pipe(file);
    
    let downloadedBytes = 0;
    const totalBytes = parseInt(response.headers['content-length'] || 0);
    
    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`\rDownloading: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
      }
    });
    
    file.on('finish', () => {
      file.close();
      console.log('\n✓ Download completed successfully!');
      console.log('File saved to:', outputPath);
      console.log('File size:', fs.statSync(outputPath).size, 'bytes');
      console.log('\nNow you can import it with:');
      console.log('cd OneMap/SQL/scripts');
      console.log('npm run import ../data/excel/' + fileName);
    });
  } else if (response.statusCode === 403) {
    console.error('\nError 403: Access denied. The file might require authentication.');
    console.error('Try using gsutil or Firebase CLI to download:');
    console.error(`gsutil cp gs://fibreflow-73daf.firebasestorage.app/csv-uploads/${fileName} .`);
  } else if (response.statusCode === 404) {
    console.error('\nError 404: File not found.');
    console.error('Please verify the file exists in Firebase Storage console.');
  } else {
    console.error('\nUnexpected status:', response.statusCode);
  }
  
}).on('error', (err) => {
  console.error('Download error:', err.message);
  fs.unlink(outputPath, () => {});
});