// Test script to verify Firebase Storage permissions from the browser
// Run this in the browser console on your deployed FibreFlow app

console.log('🧪 Testing Firebase Storage Permissions...');

// Test 1: Check Firebase configuration
console.log('📋 Firebase Config:', window.firebase?.app()?.options || 'Firebase not loaded');

// Test 2: Test authentication state
if (window.firebase?.auth) {
  const auth = window.firebase.auth();
  console.log('🔐 Auth User:', auth.currentUser?.email || 'Not authenticated');
} else {
  console.log('🔐 Auth: Firebase Auth not available');
}

// Test 3: Test storage access
if (window.firebase?.storage) {
  const storage = window.firebase.storage();
  const testRef = storage.ref('poles/test/test.jpg');
  
  // Try to get download URL (this will fail with permission error if rules aren't applied)
  testRef.getDownloadURL()
    .then(url => console.log('✅ Storage access: OK'))
    .catch(error => {
      console.log('❌ Storage error:', error.code, error.message);
      if (error.code === 'storage/unauthorized') {
        console.log('🚨 Confirmed: Storage rules not deployed yet');
        console.log('💡 Solution: Update rules in Firebase Console manually');
      }
    });
} else {
  console.log('💾 Storage: Firebase Storage not available');
}

// Test 4: Check current domain
console.log('🌐 Current domain:', window.location.origin);
console.log('📋 Expected domains: https://fibreflow-73daf.web.app');

console.log('\n📖 Instructions:');
console.log('1. If you see "storage/unauthorized" error, storage rules need updating');
console.log('2. Go to Firebase Console > Storage > Rules');
console.log('3. Update rules and publish');
console.log('4. Re-run this test');