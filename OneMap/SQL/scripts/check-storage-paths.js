// Common Firebase Storage paths to check
const possiblePaths = [
  '1754473447790_Lawley_01082025.xlsx',
  'csv-uploads/1754473447790_Lawley_01082025.xlsx',
  'uploads/1754473447790_Lawley_01082025.xlsx',
  'onemap/1754473447790_Lawley_01082025.xlsx',
  'excel/1754473447790_Lawley_01082025.xlsx',
  'pole-permissions/1754473447790_Lawley_01082025.xlsx'
];

console.log('The file might be stored at one of these paths in Firebase Storage:');
console.log('');

possiblePaths.forEach(path => {
  const encodedPath = encodeURIComponent(path);
  const url = `https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/${encodedPath}?alt=media`;
  console.log(`Path: ${path}`);
  console.log(`URL: ${url}`);
  console.log('');
});

console.log('Note: The file needs to be uploaded to Firebase Storage first.');
console.log('You can check the Firebase Console > Storage to see the exact path.');
console.log('');
console.log('Alternative: If you have the file locally, you can copy it directly to:');
console.log('/home/ldp/VF/Apps/FibreFlow/OneMap/SQL/data/excel/');