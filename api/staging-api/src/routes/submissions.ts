import { Router } from 'express';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler';
import { validatePoleData, validateSOWData } from '../validators';
import { checkDuplicates } from '../services/duplicateChecker';
import { enrichData } from '../services/dataEnricher';

const router = Router();
const db = admin.firestore();

// POST /api/v1/submit/pole
router.post('/pole', asyncHandler(async (req, res) => {
  const { data, metadata } = req.body;
  const submissionId = `stg_pole_${uuidv4()}`;
  
  // Validate pole data
  const validation = validatePoleData(data);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid pole data',
        details: validation.errors
      }
    });
  }
  
  // Check for duplicates
  const duplicateCheck = await checkDuplicates('pole', data.poleNumber);
  if (duplicateCheck.isDuplicate && !duplicateCheck.allowUpdate) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Pole already exists in staging',
        details: {
          existingId: duplicateCheck.existingId,
          submittedAt: duplicateCheck.submittedAt
        }
      }
    });
  }
  
  // Enrich data with additional context
  const enrichedData = await enrichData('pole', data);
  
  // Create staging document
  const stagingDoc = {
    id: submissionId,
    type: 'pole',
    status: 'pending_validation',
    data: enrichedData,
    metadata: {
      ...metadata,
      apiKey: req.apiKey,
      clientId: req.clientId,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    },
    validation: {
      autoChecks: {
        duplicate: duplicateCheck.isDuplicate,
        gpsValid: enrichedData.gpsValidation?.isValid || false,
        photosComplete: data.photos?.length >= 6
      },
      requiresManualReview: !validation.autoApprove,
      validatedAt: null,
      validatedBy: null
    }
  };
  
  // Save to staging collection
  await db.collection('staging_submissions').doc(submissionId).set(stagingDoc);
  
  // If auto-approve conditions met, queue for processing
  if (validation.autoApprove && !duplicateCheck.isDuplicate) {
    await db.collection('staging_queue').add({
      submissionId,
      type: 'auto_approve',
      priority: 'normal',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  res.status(201).json({
    success: true,
    data: {
      submissionId,
      status: 'pending_validation',
      message: validation.autoApprove ? 
        'Data submitted and queued for automatic processing' : 
        'Data submitted for manual validation',
      duplicateWarning: duplicateCheck.isDuplicate ? 
        'Similar record exists, will be reviewed' : null
    }
  });
}));

// POST /api/v1/submit/sow
router.post('/sow', asyncHandler(async (req, res) => {
  const { data, metadata } = req.body;
  const submissionId = `stg_sow_${uuidv4()}`;
  
  // Validate SOW data
  const validation = validateSOWData(data);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid SOW data',
        details: validation.errors
      }
    });
  }
  
  // Create staging document for SOW
  const stagingDoc = {
    id: submissionId,
    type: 'sow',
    status: 'pending_validation',
    data: {
      ...data,
      calculatedTotals: calculateSOWTotals(data.items)
    },
    metadata: {
      ...metadata,
      apiKey: req.apiKey,
      clientId: req.clientId,
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    validation: {
      requiresManualReview: true, // SOWs always need review
      validatedAt: null,
      validatedBy: null
    }
  };
  
  await db.collection('staging_submissions').doc(submissionId).set(stagingDoc);
  
  res.status(201).json({
    success: true,
    data: {
      submissionId,
      status: 'pending_validation',
      message: 'SOW submitted for review'
    }
  });
}));

// POST /api/v1/submit/bulk
router.post('/bulk', asyncHandler(async (req, res) => {
  const { submissions, metadata } = req.body;
  
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Submissions must be a non-empty array'
      }
    });
  }
  
  if (submissions.length > 100) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BATCH_TOO_LARGE',
        message: 'Maximum 100 items per bulk submission'
      }
    });
  }
  
  const results = {
    successful: [],
    failed: []
  };
  
  // Process each submission
  const batch = db.batch();
  
  for (const [index, submission] of submissions.entries()) {
    try {
      const submissionId = `stg_bulk_${uuidv4()}`;
      const validation = validatePoleData(submission.data);
      
      if (!validation.valid) {
        results.failed.push({
          index,
          error: 'Validation failed',
          details: validation.errors
        });
        continue;
      }
      
      const docRef = db.collection('staging_submissions').doc(submissionId);
      batch.set(docRef, {
        id: submissionId,
        type: submission.type || 'pole',
        status: 'pending_validation',
        data: submission.data,
        metadata: {
          ...metadata,
          bulkSubmission: true,
          apiKey: req.apiKey,
          submittedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
      
      results.successful.push({
        index,
        submissionId
      });
      
    } catch (error) {
      results.failed.push({
        index,
        error: error.message
      });
    }
  }
  
  // Commit batch
  if (results.successful.length > 0) {
    await batch.commit();
  }
  
  res.status(207).json({ // 207 Multi-Status
    success: results.failed.length === 0,
    data: {
      total: submissions.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results
    }
  });
}));

// Helper function for SOW calculations
function calculateSOWTotals(items: any[]) {
  const subtotal = items.reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice), 0
  );
  
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total,
    itemCount: items.length
  };
}

export default router;