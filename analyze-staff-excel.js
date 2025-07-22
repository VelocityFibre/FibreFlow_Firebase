const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('VF_Staff.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Excel file analysis:');
console.log('==================');
console.log(`Total rows: ${data.length}`);
console.log(`Columns found: ${Object.keys(data[0] || {}).join(', ')}`);
console.log('\nFirst 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

// Skip the header row (first row contains actual headers)
const actualData = data.slice(1);

// Map Excel data to FibreFlow format
const mappedData = actualData.map((row, index) => {
  // The columns are: Payroll (Name), __EMPTY (Job Title), __EMPTY_1 (Email)
  let name = row.Payroll || '';
  let email = row.__EMPTY_1 || '';
  let jobTitle = row.__EMPTY || '';
  
  // Generate employeeId if not present
  let employeeId = `VF${String(index + 1).padStart(3, '0')}`;
  
  // Map job title to primaryGroup
  let primaryGroup = 'Technician'; // Default
  const jobTitleLower = jobTitle.toLowerCase();
  
  if (jobTitleLower.includes('manager') || jobTitleLower.includes('pm')) {
    primaryGroup = 'ProjectManager';
  } else if (jobTitleLower.includes('admin') || jobTitleLower.includes('assistant')) {
    primaryGroup = 'Admin';
  } else if (jobTitleLower.includes('supplier')) {
    primaryGroup = 'Supplier';
  } else if (jobTitleLower.includes('client')) {
    primaryGroup = 'Client';
  }
  
  // Generate a placeholder phone number (South African format)
  let phone = `+27 8${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
  
  return {
    employeeId,
    name,
    email,
    phone,
    primaryGroup,
    position: jobTitle,
    roleId: '', // Will be assigned in system
    skills: '', // Can be added later
    certifications: '', // Can be added later
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: ''
  };
});

// Create CSV content
const headers = [
  'employeeId',
  'name',
  'email',
  'phone',
  'primaryGroup',
  'position',
  'roleId',
  'skills',
  'certifications',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship'
];

const csvContent = [
  headers.join(','),
  ...mappedData.map(row => {
    return headers.map(header => {
      const value = row[header] || '';
      // Quote the value if it contains commas or quotes
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  })
].join('\n');

// Write to CSV file
fs.writeFileSync('staff-import-ready.csv', csvContent);

console.log('\n\nCSV file created: staff-import-ready.csv');
console.log(`Total staff members ready for import: ${mappedData.length}`);

// Show validation summary
const groupCounts = {};
mappedData.forEach(staff => {
  groupCounts[staff.primaryGroup] = (groupCounts[staff.primaryGroup] || 0) + 1;
});

console.log('\nStaff by group:');
Object.entries(groupCounts).forEach(([group, count]) => {
  console.log(`  ${group}: ${count}`);
});

// Check for missing data
const missingData = mappedData.filter(staff => !staff.name || !staff.email);
if (missingData.length > 0) {
  console.log(`\nWarning: ${missingData.length} rows have missing name or email`);
  console.log('These rows:', missingData);
}