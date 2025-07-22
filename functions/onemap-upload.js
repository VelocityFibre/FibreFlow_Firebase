const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to handle OneMap CSV uploads
 * This bypasses storage permissions by processing directly in the function
 */
exports.uploadOneMapCSV = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const bb = busboy({ headers: req.headers });
    const uploads = [];
    const tmpdir = os.tmpdir();

    // Process file uploads
    bb.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
      if (!filename.endsWith('.csv')) {
        file.resume();
        return;
      }

      const filepath = path.join(tmpdir, filename);
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);

      const uploadPromise = new Promise((resolve, reject) => {
        file.on('end', () => {
          writeStream.end();
        });
        writeStream.on('finish', () => {
          resolve({
            filepath,
            filename,
            mimeType,
            size: writeStream.bytesWritten
          });
        });
        writeStream.on('error', reject);
      });

      uploads.push(uploadPromise);
    });

    bb.on('finish', async () => {
      try {
        const uploadedFiles = await Promise.all(uploads);
        
        if (uploadedFiles.length === 0) {
          return res.status(400).json({ error: 'No CSV files uploaded' });
        }

        // Process each file
        const results = [];
        for (const file of uploadedFiles) {
          // Read the file content
          const content = fs.readFileSync(file.filepath, 'utf8');
          
          // Log the upload
          const logRef = await db.collection('upload_logs').add({
            fileName: file.filename,
            fileSize: file.size,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            uploadedBy: req.headers['x-user-email'] || 'anonymous',
            processedRows: content.split('\n').length - 1, // Minus header
            status: 'uploaded',
            processed: false
          });

          // Store the CSV content temporarily for processing
          await db.collection('csv_queue').doc(logRef.id).set({
            fileName: file.filename,
            content: content,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
          });

          results.push({
            filename: file.filename,
            size: file.size,
            logId: logRef.id,
            status: 'queued for processing'
          });

          // Clean up temp file
          fs.unlinkSync(file.filepath);
        }

        res.status(200).json({
          success: true,
          files: results,
          message: 'Files uploaded successfully and queued for processing'
        });

      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
          error: 'Upload failed', 
          details: error.message 
        });
      }
    });

    bb.on('error', (error) => {
      console.error('Busboy error:', error);
      res.status(500).json({ error: 'Upload failed' });
    });

    // Pipe the request to busboy
    req.pipe(bb);
  });
});

/**
 * Alternative: Direct CSV text upload (for smaller files)
 */
exports.uploadOneMapCSVDirect = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { filename, content } = data;

  if (!filename || !content) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing filename or content'
    );
  }

  try {
    // Log the upload
    const logRef = await db.collection('upload_logs').add({
      fileName: filename,
      fileSize: content.length,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      uploadedBy: context.auth.email,
      processedRows: content.split('\n').length - 1,
      status: 'uploaded',
      processed: false
    });

    // Queue for processing
    await db.collection('csv_queue').doc(logRef.id).set({
      fileName: filename,
      content: content,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      uploadedBy: context.auth.email,
      status: 'pending'
    });

    return {
      success: true,
      logId: logRef.id,
      message: 'CSV uploaded and queued for processing'
    };

  } catch (error) {
    console.error('Direct upload error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Upload failed: ' + error.message
    );
  }
});