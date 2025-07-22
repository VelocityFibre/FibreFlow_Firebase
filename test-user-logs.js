// Test script to demonstrate user tracking in debug logs
// Run this in the browser console when logged into FibreFlow

// Test logging with user context
async function testUserLogging() {
  console.log('🧪 Testing user logging functionality...');
  
  // Import required Firebase modules
  const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js');
  const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
  
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ No user logged in! Please log in first.');
    return;
  }
  
  console.log(`✅ Logged in as: ${user.displayName || user.email}`);
  console.log(`   User ID: ${user.uid}`);
  console.log(`   Email: ${user.email}`);
  
  // Create test log entries
  const testLogs = [
    {
      level: 'info',
      message: 'User performed test action',
      component: 'TestScript',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      sessionId: `test_${Date.now()}`,
      // User information
      userId: user.uid,
      userEmail: user.email,
      userDisplayName: user.displayName || 'Unknown',
      userRole: 'admin' // This would come from user profile in real usage
    },
    {
      level: 'warn',
      message: 'User attempted restricted operation',
      component: 'SecurityTest',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      sessionId: `test_${Date.now()}`,
      userId: user.uid,
      userEmail: user.email,
      userDisplayName: user.displayName || 'Unknown',
      userRole: 'admin'
    },
    {
      level: 'error',
      message: 'Simulated error for user tracking test',
      component: 'ErrorTest',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      sessionId: `test_${Date.now()}`,
      stack: 'Error: Test error\n    at testUserLogging (test.js:45:5)',
      userId: user.uid,
      userEmail: user.email,
      userDisplayName: user.displayName || 'Unknown',
      userRole: 'admin'
    }
  ];
  
  console.log('📝 Creating test log entries...');
  
  const logsCollection = collection(db, 'debug-logs');
  
  for (const log of testLogs) {
    try {
      const docRef = await addDoc(logsCollection, log);
      console.log(`✅ Created ${log.level} log: ${docRef.id}`);
    } catch (error) {
      console.error(`❌ Failed to create ${log.level} log:`, error);
    }
  }
  
  console.log('');
  console.log('🎯 Test complete! Check the debug logs at:');
  console.log('   https://fibreflow-73daf.web.app/debug-logs');
  console.log('');
  console.log('You should see:');
  console.log('   - User name/email in the "User" column');
  console.log('   - User role displayed below the name');
  console.log('   - All actions tracked with user context');
}

// Run the test
testUserLogging();