#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function addJaniceUser() {
  console.log('🔐 Adding Janice with email tamzing27@gmail.com...\n');
  
  try {
    // Create user document
    const userData = {
      email: 'tamzing27@gmail.com',
      displayName: 'Janice',
      userGroup: 'staff', // or 'admin' if you want her to have admin rights
      roles: ['onemap_upload', 'view_analytics'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
      permissions: {
        canUploadOneMap: true,
        canViewAnalytics: true,
        canProcessData: true
      }
    };
    
    // Add to users collection
    // Using email as document ID (replacing @ and . for valid ID)
    const userId = 'tamzing27_gmail_com';
    await db.collection('users').doc(userId).set(userData, { merge: true });
    
    console.log('✅ User added successfully!');
    console.log('\n📋 User Details:');
    console.log(`Email: ${userData.email}`);
    console.log(`Display Name: ${userData.displayName}`);
    console.log(`User Group: ${userData.userGroup}`);
    console.log(`Permissions: OneMap Upload, View Analytics`);
    
    console.log('\n🔑 Next Steps:');
    console.log('1. Janice can now login with tamzing27@gmail.com');
    console.log('2. She will have access to upload OneMap CSV files');
    console.log('3. Her uploads will be tracked under this email');
    
  } catch (error) {
    console.error('❌ Error adding user:', error);
  }
}

// Run
addJaniceUser();