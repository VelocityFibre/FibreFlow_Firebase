#!/usr/bin/env node

/**
 * Complete Firebase CLI authentication
 * Extracts the auth code from the callback URL
 */

const url = 'http://localhost:9005/?state=633514217&code=4/0AVMBsJindCZlV62m74zSAAfNm-KeOZTeNxyZDZFxen4abeS7ugxjsDFwYGGnjgCKf39dlg&scope=email%20https://www.googleapis.com/auth/userinfo.email%20openid%20https://www.googleapis.com/auth/cloudplatformprojects.readonly%20https://www.googleapis.com/auth/firebase%20https://www.googleapis.com/auth/cloud-platform&authuser=0&hd=velocityfibreapp.com&prompt=consent';

// Extract the authorization code
const urlParams = new URLSearchParams(url.split('?')[1]);
const authCode = urlParams.get('code');

console.log('✅ Firebase Authorization Code:');
console.log(authCode);
console.log('\nNow run: firebase login:ci');
console.log('When prompted, paste this authorization code.');