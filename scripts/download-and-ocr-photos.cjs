const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const exifr = require('exifr');
const Tesseract = require('tesseract.js');

const firebaseConfig = {
  apiKey: 'AIzaSyD5iG5pNX0ElTHV1Vp7BhKHvO9RGzRzRCM',
  authDomain: 'fibreflow-73daf.firebaseapp.com',
  projectId: 'fibreflow-73daf',
  storageBucket: 'fibreflow-73daf.appspot.com',
  messagingSenderId: '729020567841',
  appId: '1:729020567841:web:8b3a77031b9b2b3b2c77c6'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Download image
async function downloadImage(url, filename) {
  const tempPath = path.join('./local-images', filename);
  await fs.mkdir('./local-images', { recursive: true });
  
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(tempPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(tempPath);
      });
    }).on('error', (err) => {
      fs.unlink(tempPath).catch(() => {});
      reject(err);
    });
  });
}

// Extract text from image using OCR
async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      { 
        logger: m => {
          if (m.status === 'recognizing text') {
            process.stdout.write('.');
          }
        }
      }
    );
    return text;
  } catch (error) {
    console.error('OCR Error:', error.message);
    return '';
  }
}

// Process single photo with OCR
async function processPhotoWithOCR(photoIndex = 0) {
  console.log('🔍 Processing photo with OCR to extract overlaid text...\n');
  
  try {
    // Get all images
    const q = query(
      collection(db, 'uploaded-images'),
      where('uploadedBy', '==', 'ettienejvr@gmail.com')
    );
    
    const snapshot = await getDocs(q);
    const images = [];
    snapshot.forEach(doc => {
      images.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${images.length} total images\n`);
    
    if (photoIndex >= images.length) {
      console.log('❌ Photo index out of range');
      return;
    }
    
    const image = images[photoIndex];
    console.log(`Processing photo ${photoIndex + 1}/${images.length}: ${image.fileName}`);
    
    // Get download URL
    let imageUrl = image.firebaseStorageUrl || image.url;
    
    if (!imageUrl && image.storagePath) {
      try {
        const storageRef = ref(storage, image.storagePath);
        imageUrl = await getDownloadURL(storageRef);
      } catch (e) {
        console.log('❌ Could not get download URL');
        return;
      }
    }
    
    console.log('📥 Downloading image...');
    const localPath = await downloadImage(imageUrl, image.fileName);
    console.log('✅ Downloaded to:', localPath);
    
    // Extract GPS from EXIF
    console.log('\n🔍 Extracting GPS from EXIF...');
    const gpsData = await exifr.gps(localPath);
    
    if (gpsData) {
      console.log(`✅ GPS: ${gpsData.latitude}, ${gpsData.longitude}`);
    } else {
      console.log('⚠️ No GPS in EXIF');
    }
    
    // Extract text using OCR
    console.log('\n🔍 Extracting overlaid text using OCR');
    const extractedText = await extractTextFromImage(localPath);
    console.log('\n\n📝 Extracted Text:');
    console.log('------------------------');
    console.log(extractedText);
    console.log('------------------------\n');
    
    // Look for address patterns in the text
    const lines = extractedText.split('\n').filter(line => line.trim());
    const addressPatterns = lines.filter(line => 
      line.match(/\d+.*Street|St\.|Avenue|Ave\.|Road|Rd\.|Drive|Dr\.|Lane|Ln\.|Crescent|Cres|Close|Cl|Way|Place|Pl|Park/i) ||
      line.match(/LAW\.|Lawley|ZONE|Zone/i)
    );
    
    console.log('🏠 Possible Address Lines:');
    addressPatterns.forEach(addr => console.log(`   - ${addr.trim()}`));
    
    // Create report
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Photo Data with OCR');
    
    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 40 },
      { header: 'GPS Latitude', key: 'latitude', width: 15 },
      { header: 'GPS Longitude', key: 'longitude', width: 15 },
      { header: 'Extracted Address', key: 'address', width: 60 },
      { header: 'All OCR Text', key: 'ocrText', width: 100 }
    ];
    
    worksheet.addRow({
      fileName: image.fileName,
      latitude: gpsData?.latitude || 'Not found',
      longitude: gpsData?.longitude || 'Not found',
      address: addressPatterns.join(' | ') || 'No address found',
      ocrText: extractedText.replace(/\n/g, ' ')
    });
    
    const fileName = `photo-${photoIndex + 1}-ocr-data.xlsx`;
    await workbook.xlsx.writeFile(`./reports/${fileName}`);
    
    console.log(`\n📊 Report saved: ./reports/${fileName}`);
    console.log('✅ Photo kept at:', localPath);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get photo index from command line (default 0)
const photoIndex = parseInt(process.argv[2] || '0');
processPhotoWithOCR(photoIndex);