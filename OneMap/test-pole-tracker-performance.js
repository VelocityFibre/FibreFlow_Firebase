#!/usr/bin/env node

/**
 * Pole Tracker Performance Test
 * Analyzes query performance and data size
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
const app = initializeApp({
  credential: credential.applicationDefault(),
  projectId: 'fibreflow-73daf'
});

const db = getFirestore(app);

async function testPerformance() {
  console.log('=== POLE TRACKER PERFORMANCE ANALYSIS ===\n');
  
  try {
    // Find Lawley project
    const projectsRef = db.collection('projects');
    const lawleyQuery = await projectsRef.where('projectCode', '==', 'Law-001').get();
    
    if (lawleyQuery.empty) {
      console.log('❌ Lawley project not found');
      return;
    }
    
    const project = lawleyQuery.docs[0];
    const projectId = project.id;
    console.log(`Project: Lawley (${projectId})\n`);
    
    // Test 1: Full query (current implementation)
    console.log('📊 TEST 1: Full Query (Current Implementation)');
    const startFull = Date.now();
    const fullQuery = await db.collection('planned-poles')
      .where('projectId', '==', projectId)
      .get();
    const fullQueryTime = Date.now() - startFull;
    
    console.log(`  - Documents fetched: ${fullQuery.size}`);
    console.log(`  - Query time: ${fullQueryTime}ms`);
    
    // Calculate data size
    let totalSize = 0;
    fullQuery.docs.forEach(doc => {
      totalSize += JSON.stringify(doc.data()).length;
    });
    console.log(`  - Total data size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Average doc size: ${(totalSize / fullQuery.size / 1024).toFixed(2)} KB`);
    
    // Test 2: Paginated query (recommended)
    console.log('\n📊 TEST 2: Paginated Query (Recommended)');
    const pageSize = 50;
    const startPage = Date.now();
    const pageQuery = await db.collection('planned-poles')
      .where('projectId', '==', projectId)
      .limit(pageSize)
      .get();
    const pageQueryTime = Date.now() - startPage;
    
    console.log(`  - Documents fetched: ${pageQuery.size}`);
    console.log(`  - Query time: ${pageQueryTime}ms`);
    console.log(`  - Speed improvement: ${(fullQueryTime / pageQueryTime).toFixed(2)}x faster`);
    
    // Test 3: Count query
    console.log('\n📊 TEST 3: Count Query (For Total Records)');
    const startCount = Date.now();
    const countQuery = await db.collection('planned-poles')
      .where('projectId', '==', projectId)
      .count()
      .get();
    const countQueryTime = Date.now() - startCount;
    
    console.log(`  - Total count: ${countQuery.data().count}`);
    console.log(`  - Query time: ${countQueryTime}ms`);
    
    // Test 4: Field selection (projection)
    console.log('\n📊 TEST 4: Minimal Field Query');
    const startMinimal = Date.now();
    const minimalQuery = await db.collection('planned-poles')
      .where('projectId', '==', projectId)
      .select('poleNumber', 'poleType', 'location', 'dropCount')
      .limit(100)
      .get();
    const minimalQueryTime = Date.now() - startMinimal;
    
    let minimalSize = 0;
    minimalQuery.docs.forEach(doc => {
      minimalSize += JSON.stringify(doc.data()).length;
    });
    
    console.log(`  - Documents fetched: ${minimalQuery.size}`);
    console.log(`  - Query time: ${minimalQueryTime}ms`);
    console.log(`  - Data size: ${(minimalSize / 1024).toFixed(2)} KB`);
    console.log(`  - Size reduction: ${((totalSize/fullQuery.size*100 - minimalSize)/((totalSize/fullQuery.size*100)) * 100).toFixed(1)}%`);
    
    // Performance Recommendations
    console.log('\n🚀 PERFORMANCE RECOMMENDATIONS:');
    console.log('\n1. IMMEDIATE FIXES (Quick wins):');
    console.log('   - Implement pagination with 50-100 records per page');
    console.log('   - Add loading="lazy" to images and heavy components');
    console.log('   - Use trackBy function in *ngFor loops');
    console.log(`   - Initial load reduction: ${fullQuery.size} → ${pageSize} poles (${(fullQuery.size/pageSize).toFixed(0)}x reduction)`);
    
    console.log('\n2. SHORT-TERM IMPROVEMENTS:');
    console.log('   - Implement virtual scrolling (CDK Virtual Scroll)');
    console.log('   - Add server-side filtering/search');
    console.log('   - Use field projections for list view');
    console.log('   - Implement infinite scroll pattern');
    
    console.log('\n3. LONG-TERM OPTIMIZATIONS:');
    console.log('   - Create summary documents for statistics');
    console.log('   - Implement data caching strategy');
    console.log('   - Use Firestore bundles for initial data');
    console.log('   - Consider ElasticSearch for complex queries');
    
    console.log('\n4. ESTIMATED PERFORMANCE GAINS:');
    console.log(`   - Initial load time: ~${fullQueryTime}ms → ~${pageQueryTime}ms`);
    console.log(`   - Data transfer: ${(totalSize / 1024 / 1024).toFixed(2)} MB → ${(totalSize/fullQuery.size*pageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - DOM elements: ${fullQuery.size} rows → ${pageSize} rows`);
    console.log(`   - Memory usage: ~${((totalSize / 1024 / 1024) * 3).toFixed(0)} MB → ~${((totalSize/fullQuery.size*pageSize / 1024 / 1024) * 3).toFixed(0)} MB`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run test
testPerformance().then(() => {
  console.log('\n=== ANALYSIS COMPLETE ===');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});