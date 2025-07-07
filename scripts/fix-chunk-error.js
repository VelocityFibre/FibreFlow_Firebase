#!/usr/bin/env node

/**
 * Fix dynamic import chunk error for FibreFlow
 * 
 * This script helps diagnose and fix the "Failed to fetch dynamically imported module" error
 * that occurs when old chunk files are cached by the service worker or browser.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnosing chunk loading issue...\n');

// Check if dist folder exists
const distPath = path.join(__dirname, '..', 'dist', 'fibreflow', 'browser');
if (!fs.existsSync(distPath)) {
  console.error('❌ Dist folder not found. Please run "npm run build" first.');
  process.exit(1);
}

// List all chunk files in the current build
console.log('📦 Current chunk files in build:');
const chunkFiles = fs.readdirSync(distPath)
  .filter(file => file.startsWith('chunk-') && file.endsWith('.js'))
  .sort();

chunkFiles.forEach(file => {
  const stats = fs.statSync(path.join(distPath, file));
  console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
});

console.log(`\nTotal chunks: ${chunkFiles.length}`);

// Check for the missing chunk
const missingChunk = 'chunk-MK6UFUOV.js';
if (chunkFiles.includes(missingChunk)) {
  console.log(`\n✅ The chunk ${missingChunk} exists in the current build.`);
} else {
  console.log(`\n❌ The chunk ${missingChunk} is NOT in the current build.`);
  console.log('   This indicates the error is from an old cached version.');
}

// Check service worker cache configuration
console.log('\n🔧 Service Worker Configuration:');
const swPath = path.join(__dirname, '..', 'src', 'sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  const cacheNameMatch = swContent.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  const runtimeCacheMatch = swContent.match(/RUNTIME_CACHE\s*=\s*['"]([^'"]+)['"]/);
  
  console.log(`  - Cache name: ${cacheNameMatch ? cacheNameMatch[1] : 'Not found'}`);
  console.log(`  - Runtime cache: ${runtimeCacheMatch ? runtimeCacheMatch[1] : 'Not found'}`);
}

// Solutions
console.log('\n💡 Solutions:\n');

console.log('1. **For end users experiencing this issue:**');
console.log('   - Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
console.log('   - In Chrome DevTools > Application > Storage > Clear site data');
console.log('   - Update the service worker manually:');
console.log('     - Open DevTools > Application > Service Workers');
console.log('     - Click "Update" or "skipWaiting"');
console.log('');

console.log('2. **For developers (permanent fix):**');
console.log('   a) Update service worker version:');
console.log(`      - Edit src/sw.js`);
console.log(`      - Change CACHE_NAME to 'fibreflow-v3' (increment version)`);
console.log(`      - This will force cache invalidation on next deployment`);
console.log('');

console.log('   b) Add cache busting for chunks:');
console.log('      - The Angular build already adds hashes to chunks');
console.log('      - Ensure outputHashing is set to "all" in angular.json');
console.log('');

console.log('   c) Improve service worker update handling:');
console.log('      - Add automatic update checking');
console.log('      - Show update notifications to users');
console.log('');

console.log('3. **Quick fix for deployment:**');
console.log('   - Run: npm run build:prod');
console.log('   - Deploy with: npm run deploy:hosting');
console.log('   - The new deployment will have different chunk names');
console.log('');

console.log('4. **Verify deployment:**');
console.log('   - After deployment, check: https://fibreflow-73daf.web.app/');
console.log('   - Open DevTools > Network tab');
console.log('   - Look for 404 errors on chunk files');
console.log('   - If found, users need to clear cache');

// Create a service worker update script
const swUpdateScript = `
// Add this to your app to handle service worker updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          if (confirm('New version available! Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });
  });

  // Check for updates every 5 minutes
  setInterval(() => {
    navigator.serviceWorker.ready.then(reg => reg.update());
  }, 5 * 60 * 1000);
}
`;

// Save the update script
const updateScriptPath = path.join(__dirname, 'sw-update-handler.js');
fs.writeFileSync(updateScriptPath, swUpdateScript);
console.log(`\n✅ Created service worker update handler: ${updateScriptPath}`);
console.log('   Add this to your app for better update handling.');

console.log('\n🚀 Next steps:');
console.log('   1. Update src/sw.js cache version');
console.log('   2. Run: npm run build:prod');
console.log('   3. Deploy: npm run deploy:hosting');
console.log('   4. Test in incognito/private window first');