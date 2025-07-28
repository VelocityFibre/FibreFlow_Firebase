// Check for specific uploaded image
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, getMetadata } from 'firebase/storage';

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

async function checkSpecificUpload() {
  const targetFileName = 'WhatsApp Image 2025-07-25 at 11.40.13.jpeg';
  
  console.log('🔍 Searching for uploaded image:', targetFileName);
  console.log('================================================\n');
  
  try {
    // Check in Firestore uploaded-images collection
    const uploadsRef = collection(db, 'uploaded-images');
    
    // Try to find by fileName
    const nameQuery = query(
      uploadsRef, 
      where('fileName', '==', targetFileName),
      limit(1)
    );
    
    const nameSnapshot = await getDocs(nameQuery);
    
    if (!nameSnapshot.empty) {
      console.log('✅ FOUND IMAGE IN DATABASE!\n');
      
      nameSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('📄 Document ID:', doc.id);
        console.log('📁 File Name:', data.fileName);
        console.log('📍 Site:', data.site);
        console.log('📂 Project:', data.project || 'General');
        console.log('👤 Uploaded By:', data.uploadedBy);
        console.log('📊 File Size:', Math.round(data.fileSize / 1024), 'KB');
        console.log('📅 Upload Time:', data.uploadedAt?.toDate() || 'Unknown');
        console.log('🔗 Storage Path:', data.storagePath);
        console.log('🌐 Firebase URL:', data.firebaseStorageUrl || 'Not recorded');
        console.log('\n✅ SUCCESS: Image was successfully uploaded and recorded!');
        
        // Try to verify in Storage
        if (data.storagePath) {
          console.log('\n🔍 Verifying in Firebase Storage...');
          verifyInStorage(data.storagePath);
        }
      });
    } else {
      console.log('❌ Not found by exact name. Checking recent uploads...\n');
      
      // Check recent uploads
      const recentQuery = query(
        uploadsRef,
        orderBy('uploadedAt', 'desc'),
        limit(10)
      );
      
      const recentSnapshot = await getDocs(recentQuery);
      
      console.log(`📋 Recent uploads (${recentSnapshot.size} found):\n`);
      
      let foundSimilar = false;
      recentSnapshot.forEach(doc => {
        const data = doc.data();
        const fileName = data.fileName || 'Unknown';
        
        // Check if it's a WhatsApp image from today
        if (fileName.includes('WhatsApp') && fileName.includes('2025-07-25')) {
          foundSimilar = true;
          console.log('🎯 POSSIBLE MATCH:');
          console.log('   File:', fileName);
          console.log('   Site:', data.site);
          console.log('   User:', data.uploadedBy);
          console.log('   Time:', data.uploadedAt?.toDate() || 'Unknown');
          console.log('');
        }
      });
      
      if (!foundSimilar) {
        console.log('❌ No WhatsApp images from 2025-07-25 found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking uploads:', error.message);
    if (error.code === 'permission-denied') {
      console.log('\n⚠️  Permission denied. This script needs to be run with proper authentication.');
      console.log('💡 The upload was likely successful if you saw the success message in the app!');
    }
  }
  
  process.exit(0);
}

async function verifyInStorage(storagePath) {
  try {
    const storageRef = ref(storage, storagePath);
    const metadata = await getMetadata(storageRef);
    console.log('✅ Verified in Storage!');
    console.log('   Size:', Math.round(metadata.size / 1024), 'KB');
    console.log('   Type:', metadata.contentType);
    console.log('   Updated:', new Date(metadata.updated));
  } catch (error) {
    console.log('⚠️  Could not verify in Storage (may need auth)');
  }
}

checkSpecificUpload();