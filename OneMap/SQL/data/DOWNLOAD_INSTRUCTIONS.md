# OneMap Excel File Download Instructions
*Date: 2025-08-06*

## File Location in Firebase Storage
The OneMap Excel file is stored at:
```
Path: csv-uploads/1754473447790_Lawley_01082025.xlsx
Project: fibreflow-73daf
```

## Download Methods

### Method 1: Firebase Console (Manual)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `fibreflow-73daf`
3. Navigate to Storage
4. Browse to `csv-uploads/` folder
5. Find file: `1754473447790_Lawley_01082025.xlsx`
6. Click download button
7. Save to: `OneMap/SQL/data/excel/`

### Method 2: Direct URL
```
https://firebasestorage.googleapis.com/v0/b/fibreflow-73daf.appspot.com/o/csv-uploads%2F1754473447790_Lawley_01082025.xlsx?alt=media&token=[TOKEN]
```
Note: You need the download token from Firebase Storage

### Method 3: Firebase CLI
```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login
firebase login

# Download file
firebase storage:download csv-uploads/1754473447790_Lawley_01082025.xlsx -P fibreflow-73daf
```

### Method 4: Using gsutil
```bash
# Download with gsutil
gsutil cp gs://fibreflow-73daf.appspot.com/csv-uploads/1754473447790_Lawley_01082025.xlsx .
```

## After Download
Once you have the file, place it in:
```
OneMap/SQL/data/excel/1754473447790_Lawley_01082025.xlsx
```

Then run:
```bash
cd OneMap/SQL/scripts
npm run import ../data/excel/1754473447790_Lawley_01082025.xlsx
```