#!/usr/bin/env node

/**
 * Test the tracking hierarchy logic
 */

// Test cases
const testRecords = [
  {
    name: "Early stage - no pole or drop",
    record: {
      'Property ID': '12345',
      'Location Address': '74 Market Street',
      'Status': 'Survey Requested'
    },
    expected: { type: 'address', key: '74 Market Street' }
  },
  {
    name: "Drop assigned but no pole",
    record: {
      'Property ID': '12346',
      'Drop Number': 'DR1234',
      'Location Address': '74 Market Street',
      'Status': 'Home Sign Up'
    },
    expected: { type: 'drop', key: 'DR1234' }
  },
  {
    name: "Full record with pole",
    record: {
      'Property ID': '12347',
      'Pole Number': 'LAW.P.B167',
      'Drop Number': 'DR1234',
      'Location Address': '74 Market Street',
      'Status': 'Pole Permission: Approved'
    },
    expected: { type: 'pole', key: 'LAW.P.B167' }
  },
  {
    name: "Only property ID available",
    record: {
      'Property ID': '12348',
      'Status': 'Initial Contact'
    },
    expected: { type: 'property', key: '12348' }
  }
];

// Add getTrackingKey function for testing
function getTrackingKey(record) {
  // Hierarchy: pole → drop → address → property
  if (record['Pole Number'] && record['Pole Number'].trim()) {
    return { type: 'pole', key: record['Pole Number'].trim() };
  }
  if (record['Drop Number'] && record['Drop Number'].trim()) {
    return { type: 'drop', key: record['Drop Number'].trim() };
  }
  if (record['Location Address'] && record['Location Address'].trim()) {
    return { type: 'address', key: record['Location Address'].trim() };
  }
  // Last resort - use property ID
  return { type: 'property', key: record['Property ID'] };
}

console.log('🧪 Testing Tracking Hierarchy Logic\n');

testRecords.forEach(test => {
  const result = getTrackingKey(test.record);
  const passed = result.type === test.expected.type && result.key === test.expected.key;
  
  console.log(`Test: ${test.name}`);
  console.log(`  Expected: ${test.expected.type}:${test.expected.key}`);
  console.log(`  Got: ${result.type}:${result.key}`);
  console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});

// Test status normalization
console.log('🧪 Testing Status Normalization\n');

function normalizeStatus(status) {
  if (!status) return '';
  return status.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/permissions/g, 'permission')
    .replace(/sign ups/g, 'sign up')
    .replace(/home sign up/g, 'home signup')
    .trim();
}

const statusTests = [
  { input: 'Pole Permission: Approved', expected: 'pole permission: approved' },
  { input: 'Pole Permissions: Approved', expected: 'pole permission: approved' },
  { input: 'POLE PERMISSION: APPROVED', expected: 'pole permission: approved' },
  { input: 'Home Sign Ups: Approved', expected: 'home signup: approved' },
  { input: 'Home Sign Up', expected: 'home signup' }
];

statusTests.forEach(test => {
  const result = normalizeStatus(test.input);
  const passed = result === test.expected;
  
  console.log(`Input: "${test.input}"`);
  console.log(`  Expected: "${test.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});