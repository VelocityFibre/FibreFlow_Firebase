#!/usr/bin/env node

/**
 * Bundle Size Analyzer for FibreFlow
 * Helps identify large dependencies and optimization opportunities
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing FibreFlow bundle size...\n');

// Check if stats.json exists, if not build with stats
const statsPath = path.join(__dirname, 'dist/fibreflow/browser/stats.json');

if (!fs.existsSync(statsPath)) {
  console.log('Building production bundle with stats...');
  console.log('This may take a few minutes...\n');
  
  exec('ng build --stats-json', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Build failed:', error);
      return;
    }
    
    console.log('✅ Build complete!\n');
    analyzeBundle();
  });
} else {
  analyzeBundle();
}

function analyzeBundle() {
  if (!fs.existsSync(statsPath)) {
    console.error('❌ stats.json not found. Please run: ng build --stats-json');
    return;
  }

  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  
  // Analyze main bundles
  const assets = stats.assets
    .filter(asset => asset.name.endsWith('.js'))
    .sort((a, b) => b.size - a.size);
  
  console.log('📦 Top JavaScript bundles by size:\n');
  console.log('Bundle Name                                    Size (KB)    Gzipped (KB)');
  console.log('─'.repeat(70));
  
  let totalSize = 0;
  assets.slice(0, 10).forEach(asset => {
    const sizeKB = (asset.size / 1024).toFixed(2);
    const gzipKB = asset.gzipSize ? (asset.gzipSize / 1024).toFixed(2) : 'N/A';
    totalSize += asset.size;
    
    const name = asset.name.padEnd(45);
    const size = sizeKB.padStart(10);
    const gzip = gzipKB.padStart(12);
    console.log(`${name} ${size} ${gzip}`);
  });
  
  console.log('─'.repeat(70));
  console.log(`Total main bundle size: ${(totalSize / 1024).toFixed(2)} KB\n`);
  
  // Analyze dependencies
  if (stats.modules) {
    const nodeModules = stats.modules.filter(m => m.name.includes('node_modules'));
    const dependencies = {};
    
    nodeModules.forEach(module => {
      const match = module.name.match(/node_modules\/([^/]+)/);
      if (match) {
        const dep = match[1];
        dependencies[dep] = (dependencies[dep] || 0) + module.size;
      }
    });
    
    const sortedDeps = Object.entries(dependencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    console.log('📚 Largest dependencies:\n');
    console.log('Package                                Size (KB)');
    console.log('─'.repeat(50));
    
    sortedDeps.forEach(([name, size]) => {
      const pkgName = name.padEnd(35);
      const pkgSize = (size / 1024).toFixed(2).padStart(10);
      console.log(`${pkgName} ${pkgSize}`);
    });
  }
  
  // Optimization recommendations
  console.log('\n🎯 Optimization Recommendations:\n');
  
  // Check for common issues
  const recommendations = [];
  
  // Check for moment.js
  if (stats.modules?.some(m => m.name.includes('moment'))) {
    recommendations.push('• Consider replacing moment.js with date-fns or native Date');
  }
  
  // Check for lodash
  if (stats.modules?.some(m => m.name.includes('lodash') && !m.name.includes('lodash-es'))) {
    recommendations.push('• Use lodash-es instead of lodash for better tree-shaking');
  }
  
  // Check bundle sizes
  const mainBundle = assets.find(a => a.name.startsWith('main'));
  if (mainBundle && mainBundle.size > 500 * 1024) {
    recommendations.push('• Main bundle is large (>500KB). Consider lazy loading more features');
  }
  
  // Check for Firebase
  if (stats.modules?.some(m => m.name.includes('@firebase'))) {
    recommendations.push('• Ensure Firebase SDK is imported modularly (not the compat version)');
  }
  
  // Material imports
  recommendations.push('• Use direct Material imports instead of importing entire modules');
  recommendations.push('• Enable Angular build optimization flags in angular.json');
  recommendations.push('• Consider using @angular/pwa for service worker and caching');
  
  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log('✅ Bundle looks well optimized!');
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Run "npx webpack-bundle-analyzer dist/fibreflow/browser/stats.json" for visual analysis');
  console.log('2. Review angular.json optimization settings');
  console.log('3. Implement lazy loading for large features');
  console.log('4. Use OnPush change detection strategy\n');
}