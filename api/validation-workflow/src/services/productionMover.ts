import * as admin from 'firebase-admin';
import { sql } from '../config/neon';

interface ProductionMoveResult {
  success: boolean;
  ids: {
    firebase?: string;
    neon?: string;
  };
  errors?: string[];
}

export async function moveToProduction(submission: any): Promise<ProductionMoveResult> {
  const result: ProductionMoveResult = {
    success: false,
    ids: {},
    errors: []
  };
  
  try {
    switch (submission.type) {
      case 'pole':
        return await movePoleToProduction(submission);
      case 'sow':
        return await moveSOWToProduction(submission);
      default:
        throw new Error(`Unknown submission type: ${submission.type}`);
    }
  } catch (error) {
    console.error('Production move error:', error);
    result.errors.push(error.message);
    return result;
  }
}

async function movePoleToProduction(submission: any): Promise<ProductionMoveResult> {
  const db = admin.firestore();
  const { data, metadata } = submission;
  
  const result: ProductionMoveResult = {
    success: false,
    ids: {},
    errors: []
  };
  
  try {
    // Prepare production data
    const productionData = {
      poleNumber: data.poleNumber,
      projectId: data.projectId,
      status: 'installed',
      gps: {
        latitude: data.gps.latitude,
        longitude: data.gps.longitude,
        accuracy: data.gps.accuracy || null
      },
      location: new admin.firestore.GeoPoint(
        data.gps.latitude,
        data.gps.longitude
      ),
      photos: data.photos,
      contractorId: data.contractorId || null,
      notes: data.notes || null,
      installationDate: admin.firestore.Timestamp.now(),
      
      // Metadata
      capturedBy: metadata.clientId || 'api',
      stagingId: submission.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Validation metadata
      validationScore: submission.validation?.result?.score || null,
      autoApproved: submission.validation?.autoApproved || false,
      approvedBy: submission.validation?.approvedBy || 'system'
    };
    
    // 1. Write to Firebase
    const firebaseRef = await db.collection('poles').add(productionData);
    result.ids.firebase = firebaseRef.id;
    
    // 2. Write to Neon for analytics
    try {
      const neonResult = await sql`
        INSERT INTO poles (
          pole_number,
          project_id,
          status,
          gps_latitude,
          gps_longitude,
          gps_accuracy,
          location_address,
          contractor_id,
          installation_date,
          notes,
          firebase_id,
          staging_id,
          validation_score,
          auto_approved,
          created_at,
          updated_at
        ) VALUES (
          ${data.poleNumber},
          ${data.projectId},
          'installed',
          ${data.gps.latitude},
          ${data.gps.longitude},
          ${data.gps.accuracy || null},
          ${data.locationAddress || null},
          ${data.contractorId || null},
          ${new Date()},
          ${data.notes || null},
          ${firebaseRef.id},
          ${submission.id},
          ${submission.validation?.result?.score || null},
          ${submission.validation?.autoApproved || false},
          ${new Date()},
          ${new Date()}
        )
        RETURNING id
      `;
      
      if (neonResult.length > 0) {
        result.ids.neon = neonResult[0].id;
      }
    } catch (neonError) {
      console.error('Neon insert failed:', neonError);
      result.errors.push(`Neon sync failed: ${neonError.message}`);
      // Don't fail the whole operation if Neon fails
    }
    
    // 3. Update project statistics
    try {
      const projectRef = db.collection('projects').doc(data.projectId);
      await projectRef.update({
        'statistics.totalPoles': admin.firestore.FieldValue.increment(1),
        'statistics.installedPoles': admin.firestore.FieldValue.increment(1),
        'statistics.lastPoleInstalled': admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (statsError) {
      console.error('Stats update failed:', statsError);
      result.errors.push(`Stats update failed: ${statsError.message}`);
    }
    
    // 4. Create activity log
    await db.collection('activity_logs').add({
      type: 'pole_installed',
      entityType: 'pole',
      entityId: firebaseRef.id,
      projectId: data.projectId,
      poleNumber: data.poleNumber,
      action: 'Pole moved from staging to production',
      performedBy: 'system',
      metadata: {
        stagingId: submission.id,
        validationScore: submission.validation?.result?.score
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    result.success = true;
    return result;
    
  } catch (error) {
    console.error('Pole production move failed:', error);
    result.errors.push(error.message);
    
    // Attempt rollback if Firebase write succeeded but something else failed
    if (result.ids.firebase) {
      try {
        await db.collection('poles').doc(result.ids.firebase).delete();
        result.ids.firebase = undefined;
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        result.errors.push(`Rollback failed: ${rollbackError.message}`);
      }
    }
    
    return result;
  }
}

async function moveSOWToProduction(submission: any): Promise<ProductionMoveResult> {
  const db = admin.firestore();
  const { data, metadata } = submission;
  
  const result: ProductionMoveResult = {
    success: false,
    ids: {},
    errors: []
  };
  
  try {
    // Prepare SOW data
    const sowData = {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      items: data.items,
      totals: data.calculatedTotals,
      status: 'draft',
      
      // Metadata
      createdBy: metadata.clientId || 'api',
      stagingId: submission.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Write to Firebase
    const sowRef = await db.collection('sow_documents').add(sowData);
    result.ids.firebase = sowRef.id;
    
    // Create activity log
    await db.collection('activity_logs').add({
      type: 'sow_created',
      entityType: 'sow',
      entityId: sowRef.id,
      projectId: data.projectId,
      action: 'SOW document created from staging',
      performedBy: 'system',
      metadata: {
        stagingId: submission.id,
        totalAmount: data.calculatedTotals.total
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    result.success = true;
    return result;
    
  } catch (error) {
    console.error('SOW production move failed:', error);
    result.errors.push(error.message);
    return result;
  }
}