import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { FirebaseDocument } from '../models/types';
import chalk from 'chalk';
import * as path from 'path';

export class FirebaseService {
  private _app: App;
  private db: Firestore;
  
  constructor(serviceAccountPath: string) {
    const absolutePath = path.resolve(serviceAccountPath);
    this._app = initializeApp({
      credential: cert(absolutePath)
    });
    this.db = getFirestore();
  }
  
  async batchWrite(
    collectionPath: string,
    documents: FirebaseDocument[],
    options: { 
      idField?: string; 
      subcollectionOf?: string; 
      parentId?: string;
      checkDuplicates?: boolean;
      duplicateField?: string;
    } = {}
  ): Promise<void> {
    const { 
      idField = 'id', 
      subcollectionOf, 
      parentId,
      checkDuplicates = true,
      duplicateField = 'airtableId'
    } = options;
    
    // Calculate collection reference
    let collectionRef;
    if (subcollectionOf && parentId) {
      collectionRef = this.db.collection(subcollectionOf).doc(parentId).collection(collectionPath);
    } else {
      collectionRef = this.db.collection(collectionPath);
    }
    
    // Check for duplicates if enabled
    let documentsToWrite = documents;
    if (checkDuplicates && duplicateField) {
      console.log(chalk.yellow(`Checking for duplicates based on ${duplicateField}...`));
      documentsToWrite = await this.filterDuplicates(collectionRef, documents, duplicateField);
      
      if (documents.length !== documentsToWrite.length) {
        const skipped = documents.length - documentsToWrite.length;
        console.log(chalk.yellow(`⚠️  Skipping ${skipped} duplicate records`));
      }
    }
    
    if (documentsToWrite.length === 0) {
      console.log(chalk.gray('No new records to write'));
      return;
    }
    
    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    const batches: WriteBatch[] = [];
    let currentBatch = this.db.batch();
    let operationCount = 0;
    
    console.log(chalk.blue(`Writing ${documentsToWrite.length} documents to ${collectionPath}...`));
    
    for (const doc of documentsToWrite) {
      const docId = doc[idField] || collectionRef.doc().id;
      const docRef = collectionRef.doc(docId);
      
      // Ensure timestamps
      if (!doc.createdAt) {
        doc.createdAt = Timestamp.now();
      }
      doc.updatedAt = Timestamp.now();
      
      currentBatch.set(docRef, doc);
      operationCount++;
      
      if (operationCount >= batchSize) {
        batches.push(currentBatch);
        currentBatch = this.db.batch();
        operationCount = 0;
      }
    }
    
    // Add remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches
    console.log(chalk.gray(`  Committing ${batches.length} batches...`));
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(chalk.gray(`  Batch ${i + 1}/${batches.length} committed`));
    }
    
    console.log(chalk.green(`✓ Successfully wrote ${documents.length} documents to ${collectionPath}`));
  }
  
  async updateDocument(
    collectionPath: string,
    documentId: string,
    data: Partial<FirebaseDocument>
  ): Promise<void> {
    data.updatedAt = Timestamp.now();
    await this.db.collection(collectionPath).doc(documentId).update(data);
  }
  
  async getDocument(collectionPath: string, documentId: string): Promise<FirebaseDocument | null> {
    const doc = await this.db.collection(collectionPath).doc(documentId).get();
    return doc.exists ? doc.data() as FirebaseDocument : null;
  }
  
  async deleteCollection(collectionPath: string, batchSize = 100): Promise<void> {
    const collectionRef = this.db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);
    
    return new Promise((resolve, reject) => {
      deleteQueryBatch(this.db, query, resolve).catch(reject);
    });
  }
  
  async checkConnection(): Promise<boolean> {
    try {
      // Try to read a simple document to verify connection
      await this.db.collection('_migration_test').doc('test').set({
        timestamp: Timestamp.now()
      });
      await this.db.collection('_migration_test').doc('test').delete();
      return true;
    } catch (error) {
      console.error(chalk.red('Firebase connection failed:', error));
      return false;
    }
  }
  
  private async filterDuplicates(
    collectionRef: FirebaseFirestore.CollectionReference,
    documents: FirebaseDocument[],
    duplicateField: string
  ): Promise<FirebaseDocument[]> {
    const uniqueDocs: FirebaseDocument[] = [];
    const batchSize = 10; // Check in small batches
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const promises = batch.map(async (doc) => {
        if (!doc[duplicateField]) {
          return { doc, exists: false };
        }
        
        const existing = await collectionRef
          .where(duplicateField, '==', doc[duplicateField])
          .limit(1)
          .get();
        
        return { doc, exists: !existing.empty };
      });
      
      const results = await Promise.all(promises);
      
      for (const { doc, exists } of results) {
        if (!exists) {
          uniqueDocs.push(doc);
        } else {
          console.log(chalk.gray(`  Duplicate found: ${doc[duplicateField]}}`));
        }
      }
    }
    
    return uniqueDocs;
  }
  
  async checkExistingRecords(
    collectionPath: string,
    field: string,
    values: string[]
  ): Promise<Set<string>> {
    const existing = new Set<string>();
    const collectionRef = this.db.collection(collectionPath);
    
    // Check in batches of 10 (Firestore 'in' query limit)
    for (let i = 0; i < values.length; i += 10) {
      const batch = values.slice(i, i + 10).filter(v => v);
      if (batch.length === 0) continue;
      
      const snapshot = await collectionRef
        .where(field, 'in', batch)
        .get();
      
      snapshot.forEach(doc => {
        const value = doc.data()[field];
        if (value) existing.add(value);
      });
    }
    
    return existing;
  }
}

async function deleteQueryBatch(
  db: Firestore,
  query: FirebaseFirestore.Query,
  resolve: () => void
): Promise<void> {
  const snapshot = await query.get();
  
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}