import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { validatePoleSubmission } from './validators/poleValidator';
import { validateSOWSubmission } from './validators/sowValidator';
import { moveToProduction } from './services/productionMover';
import { notifyAdmins } from './services/notificationService';
import { createAuditLog } from './services/auditService';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Process validation queue every 5 minutes
export const processValidationQueue = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 540 // 9 minutes
  })
  .pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Starting validation queue processing');
    
    // Get pending submissions
    const pendingSnapshot = await db.collection('staging_submissions')
      .where('status', '==', 'pending_validation')
      .orderBy('metadata.submittedAt', 'asc')
      .limit(50) // Process 50 at a time
      .get();
    
    console.log(`Found ${pendingSnapshot.size} pending submissions`);
    
    const batch = db.batch();
    const notifications = [];
    
    for (const doc of pendingSnapshot.docs) {
      const submission = doc.data();
      const submissionRef = doc.ref;
      
      try {
        // Update status to processing
        batch.update(submissionRef, {
          status: 'auto_validating',
          'validation.startedAt': admin.firestore.FieldValue.serverTimestamp()
        });
        
        let validationResult;
        
        // Run appropriate validator based on type
        switch (submission.type) {
          case 'pole':
            validationResult = await validatePoleSubmission(submission);
            break;
          case 'sow':
            validationResult = await validateSOWSubmission(submission);
            break;
          default:
            throw new Error(`Unknown submission type: ${submission.type}`);
        }
        
        // Update submission with validation results
        if (validationResult.isValid && validationResult.autoApprove) {
          // Auto-approve
          batch.update(submissionRef, {
            status: 'approved',
            'validation.result': validationResult,
            'validation.completedAt': admin.firestore.FieldValue.serverTimestamp(),
            'validation.autoApproved': true
          });
          
          // Queue for production move
          const moveRef = db.collection('production_queue').doc();
          batch.set(moveRef, {
            submissionId: doc.id,
            type: submission.type,
            priority: validationResult.priority || 'normal',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
        } else if (validationResult.isValid && !validationResult.autoApprove) {
          // Requires manual review
          batch.update(submissionRef, {
            status: 'requires_review',
            'validation.result': validationResult,
            'validation.requiresReviewReasons': validationResult.reviewReasons,
            'validation.completedAt': admin.firestore.FieldValue.serverTimestamp()
          });
          
          notifications.push({
            type: 'manual_review_required',
            submissionId: doc.id,
            reasons: validationResult.reviewReasons
          });
          
        } else {
          // Validation failed
          batch.update(submissionRef, {
            status: 'rejected',
            'validation.result': validationResult,
            'validation.rejectionReasons': validationResult.errors,
            'validation.completedAt': admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Create audit log
        await createAuditLog({
          action: 'validation_processed',
          submissionId: doc.id,
          type: submission.type,
          result: validationResult.isValid ? 'valid' : 'invalid',
          autoApproved: validationResult.autoApprove,
          details: validationResult
        });
        
      } catch (error) {
        console.error(`Error processing submission ${doc.id}:`, error);
        
        batch.update(submissionRef, {
          status: 'error',
          'validation.error': error.message,
          'validation.errorAt': admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    // Commit all updates
    await batch.commit();
    
    // Send notifications
    if (notifications.length > 0) {
      await notifyAdmins(notifications);
    }
    
    console.log('Validation queue processing completed');
    return null;
  });

// Move approved data to production
export const moveApprovedToProduction = functions
  .runWith({
    memory: '2GB',
    timeoutSeconds: 540
  })
  .pubsub.schedule('every 10 minutes')
  .onRun(async (context) => {
    console.log('Starting production move process');
    
    // Get approved submissions from queue
    const queueSnapshot = await db.collection('production_queue')
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'asc')
      .limit(20)
      .get();
    
    console.log(`Found ${queueSnapshot.size} items to move to production`);
    
    for (const queueDoc of queueSnapshot.docs) {
      const queueItem = queueDoc.data();
      
      try {
        // Get the submission
        const submissionDoc = await db.collection('staging_submissions')
          .doc(queueItem.submissionId)
          .get();
        
        if (!submissionDoc.exists) {
          console.error(`Submission ${queueItem.submissionId} not found`);
          await queueDoc.ref.delete();
          continue;
        }
        
        const submission = submissionDoc.data();
        
        // Move to production
        const result = await moveToProduction(submission);
        
        // Update submission status
        await submissionDoc.ref.update({
          status: 'completed',
          'production.movedAt': admin.firestore.FieldValue.serverTimestamp(),
          'production.result': result
        });
        
        // Remove from queue
        await queueDoc.ref.delete();
        
        // Create audit log
        await createAuditLog({
          action: 'moved_to_production',
          submissionId: queueItem.submissionId,
          type: submission.type,
          productionIds: result.ids,
          details: result
        });
        
        console.log(`Successfully moved ${queueItem.submissionId} to production`);
        
      } catch (error) {
        console.error(`Error moving ${queueItem.submissionId} to production:`, error);
        
        // Update error count
        const errorCount = (queueItem.errorCount || 0) + 1;
        
        if (errorCount >= 3) {
          // Too many errors, move to dead letter queue
          await db.collection('dead_letter_queue').add({
            ...queueItem,
            error: error.message,
            movedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          await queueDoc.ref.delete();
          
          // Notify admins
          await notifyAdmins([{
            type: 'production_move_failed',
            submissionId: queueItem.submissionId,
            error: error.message
          }]);
        } else {
          // Increment error count and retry later
          await queueDoc.ref.update({
            errorCount,
            lastError: error.message,
            lastErrorAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    
    console.log('Production move process completed');
    return null;
  });

// Manual approval endpoint for admin UI
export const approveSubmission = functions.https.onCall(async (data, context) => {
  // Check admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can approve submissions'
    );
  }
  
  const { submissionId, corrections, notes } = data;
  
  if (!submissionId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Submission ID is required'
    );
  }
  
  const submissionRef = db.collection('staging_submissions').doc(submissionId);
  const submissionDoc = await submissionRef.get();
  
  if (!submissionDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Submission not found'
    );
  }
  
  const submission = submissionDoc.data();
  
  if (submission.status !== 'requires_review') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Submission is in ${submission.status} status, not requires_review`
    );
  }
  
  // Apply corrections if provided
  const finalData = corrections ? 
    { ...submission.data, ...corrections } : 
    submission.data;
  
  // Update submission
  await submissionRef.update({
    status: 'approved',
    data: finalData,
    'validation.manuallyApproved': true,
    'validation.approvedBy': context.auth.uid,
    'validation.approvedAt': admin.firestore.FieldValue.serverTimestamp(),
    'validation.approvalNotes': notes || null,
    'validation.corrections': corrections || null
  });
  
  // Queue for production
  await db.collection('production_queue').add({
    submissionId,
    type: submission.type,
    priority: 'high', // Manual approvals get high priority
    approvedBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Create audit log
  await createAuditLog({
    action: 'manual_approval',
    submissionId,
    type: submission.type,
    approvedBy: context.auth.uid,
    corrections: corrections || null,
    notes: notes || null
  });
  
  return {
    success: true,
    message: 'Submission approved and queued for production'
  };
});

// Manual rejection endpoint
export const rejectSubmission = functions.https.onCall(async (data, context) => {
  // Check admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can reject submissions'
    );
  }
  
  const { submissionId, reason, details } = data;
  
  if (!submissionId || !reason) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Submission ID and reason are required'
    );
  }
  
  const submissionRef = db.collection('staging_submissions').doc(submissionId);
  const submissionDoc = await submissionRef.get();
  
  if (!submissionDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      'Submission not found'
    );
  }
  
  const submission = submissionDoc.data();
  
  // Update submission
  await submissionRef.update({
    status: 'rejected',
    'validation.manuallyRejected': true,
    'validation.rejectedBy': context.auth.uid,
    'validation.rejectedAt': admin.firestore.FieldValue.serverTimestamp(),
    'validation.rejectionReason': reason,
    'validation.rejectionDetails': details || null
  });
  
  // Create audit log
  await createAuditLog({
    action: 'manual_rejection',
    submissionId,
    type: submission.type,
    rejectedBy: context.auth.uid,
    reason,
    details: details || null
  });
  
  // Notify submitter if possible
  // This could send an email or create a notification
  
  return {
    success: true,
    message: 'Submission rejected'
  };
});

// Cleanup old staging records
export const cleanupStaging = functions.pubsub
  .schedule('every day 03:00')
  .timeZone('Africa/Johannesburg')
  .onRun(async (context) => {
    console.log('Starting staging cleanup');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days retention
    
    // Get old completed/rejected records
    const oldRecords = await db.collection('staging_submissions')
      .where('status', 'in', ['completed', 'rejected'])
      .where('metadata.submittedAt', '<', cutoffDate)
      .limit(500)
      .get();
    
    console.log(`Found ${oldRecords.size} old records to clean up`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const doc of oldRecords.docs) {
      // Archive to cold storage if needed
      const archiveRef = db.collection('staging_archive').doc(doc.id);
      batch.set(archiveRef, {
        ...doc.data(),
        archivedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Delete from staging
      batch.delete(doc.ref);
      
      count++;
      
      // Firestore batch limit is 500
      if (count >= 400) {
        await batch.commit();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    console.log('Staging cleanup completed');
    return null;
  });