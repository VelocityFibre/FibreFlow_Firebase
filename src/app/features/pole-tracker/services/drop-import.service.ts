import { Injectable } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { inject } from '@angular/core';

export interface DropCableRecord {
  label: string; // DR1753027
  type: string; // Cable
  subtype: string; // Drop
  specification: string; // SM/G657A2
  dimension1: string; // 2.8mm
  dimension2: string; // 30m
  cableCapacity: string; // 1F
  contractor: string; // Empty or contractor name
  networkPattern: string; // Empty
  componentOwner: string; // PlanNet
  startFeature: string; // LAW.P.C675 (pole reference)
  endFeature: string; // LAW.ONT.DR1753027 (ONT reference)
  latitude: string; // Empty
  longitude: string; // Empty
  sg21: string; // Empty
  sg26: string; // Empty
  address: string; // Empty
  ponNumber: string; // 135
  zoneNumber: string; // 11
  subplace: string; // 798038001
  mainplace: string; // 798038
  municipality: string; // City of Johannesburg
  stackRef: string; // LAW
  dateCreated: string; // 2025-04-14T07:50:57.765
  createdBy: string; // PlanNet
  dateEdited: string; // Empty
  editedBy: string; // Empty
  comments: string; // Empty
}

export interface ProcessedDropData {
  dropId: string;
  dropNumber: string;
  poleNumber: string;
  ontReference: string;
  cableLength: string;
  cableType: string;
  ponNumber: string;
  zoneNumber: string;
  municipality: string;
  projectCode: string;
  dateCreated: Date;
  createdBy: string;
  status: 'planned' | 'installed' | 'activated';
  valid: boolean;
  errors: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DropImportService {
  private firestore = inject(Firestore);

  async parseCsvFile(file: File): Promise<DropCableRecord[]> {
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV must contain at least header and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const records: DropCableRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));

      if (values.length < headers.length) continue;

      const record: DropCableRecord = {
        label: values[0] || '',
        type: values[1] || '',
        subtype: values[2] || '',
        specification: values[3] || '',
        dimension1: values[4] || '',
        dimension2: values[5] || '',
        cableCapacity: values[6] || '',
        contractor: values[7] || '',
        networkPattern: values[8] || '',
        componentOwner: values[9] || '',
        startFeature: values[10] || '',
        endFeature: values[11] || '',
        latitude: values[12] || '',
        longitude: values[13] || '',
        sg21: values[14] || '',
        sg26: values[15] || '',
        address: values[16] || '',
        ponNumber: values[17] || '',
        zoneNumber: values[18] || '',
        subplace: values[19] || '',
        mainplace: values[20] || '',
        municipality: values[21] || '',
        stackRef: values[22] || '',
        dateCreated: values[23] || '',
        createdBy: values[24] || '',
        dateEdited: values[25] || '',
        editedBy: values[26] || '',
        comments: values[27] || '',
      };

      records.push(record);
    }

    return records;
  }

  processDropRecords(records: DropCableRecord[]): ProcessedDropData[] {
    return records.map((record) => {
      const errors: string[] = [];

      // Extract drop number from label (DR1753027)
      const dropNumber = record.label;
      if (!dropNumber || !dropNumber.startsWith('DR')) {
        errors.push('Invalid drop number format - must start with DR');
      }

      // Extract pole number from start feature (LAW.P.C675)
      const poleMatch = record.startFeature.match(/LAW\.P\.C(\d+)/);
      const poleNumber = poleMatch ? `C${poleMatch[1]}` : '';
      if (!poleNumber) {
        errors.push('Cannot extract pole number from start feature');
      }

      // Extract ONT reference from end feature (LAW.ONT.DR1753027)
      const ontReference = record.endFeature.replace('LAW.ONT.', '') || '';
      if (!ontReference) {
        errors.push('Missing ONT reference');
      }

      // Parse cable length from dimension2 (30m)
      const cableLength = record.dimension2;
      if (!cableLength || !cableLength.includes('m')) {
        errors.push('Invalid cable length format');
      }

      // Parse date
      let dateCreated: Date;
      try {
        dateCreated = new Date(record.dateCreated);
        if (isNaN(dateCreated.getTime())) {
          throw new Error('Invalid date');
        }
      } catch {
        errors.push('Invalid date format');
        dateCreated = new Date();
      }

      return {
        dropId: record.label,
        dropNumber: dropNumber,
        poleNumber: poleNumber,
        ontReference: ontReference,
        cableLength: cableLength,
        cableType: `${record.specification} ${record.dimension1}`,
        ponNumber: record.ponNumber,
        zoneNumber: record.zoneNumber,
        municipality: record.municipality,
        projectCode: record.stackRef,
        dateCreated: dateCreated,
        createdBy: record.createdBy,
        status: 'planned' as const,
        valid: errors.length === 0,
        errors: errors,
      };
    });
  }

  async validateDropUniqueness(drops: ProcessedDropData[]): Promise<ProcessedDropData[]> {
    // Get existing drops from Firebase
    const dropsCollection = collection(this.firestore, 'drops');
    const existingSnap = await getDocs(dropsCollection);
    const existingDrops = existingSnap.docs.map((doc) => doc.data()['dropNumber']);

    // Check for duplicates within the import
    const dropNumbers = drops.map((d) => d.dropNumber);
    const duplicatesInImport = dropNumbers.filter(
      (num, index) => dropNumbers.indexOf(num) !== index,
    );

    return drops.map((drop) => {
      const errors = [...drop.errors];

      // Check against existing drops
      if (existingDrops.includes(drop.dropNumber)) {
        errors.push(`Drop ${drop.dropNumber} already exists in database`);
      }

      // Check duplicates in current import
      if (duplicatesInImport.includes(drop.dropNumber)) {
        errors.push(`Duplicate drop ${drop.dropNumber} in import file`);
      }

      return {
        ...drop,
        errors: errors,
        valid: errors.length === 0,
      };
    });
  }

  async importDropsToProject(
    projectId: string,
    drops: ProcessedDropData[],
    userId: string,
  ): Promise<{
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    const batch = writeBatch(this.firestore);
    const dropsCollection = collection(this.firestore, 'drops');
    const validDrops = drops.filter((d) => d.valid);
    const errors: string[] = [];
    let successCount = 0;

    for (const drop of validDrops) {
      try {
        const docRef = doc(dropsCollection);
        batch.set(docRef, {
          id: docRef.id,
          projectId: projectId,
          dropNumber: drop.dropNumber,
          dropId: drop.dropId,
          poleNumber: drop.poleNumber,
          ontReference: drop.ontReference,
          cableLength: drop.cableLength,
          cableType: drop.cableType,
          ponNumber: drop.ponNumber,
          zoneNumber: drop.zoneNumber,
          municipality: drop.municipality,
          projectCode: drop.projectCode,
          status: drop.status,
          dateCreated: drop.dateCreated,
          createdBy: drop.createdBy,
          importedBy: userId,
          importedAt: new Date(),
          lastModified: new Date(),
          lastModifiedBy: userId,
        });
        successCount++;
      } catch (error) {
        errors.push(`Failed to import drop ${drop.dropNumber}: ${error}`);
      }
    }

    try {
      await batch.commit();
      return {
        successCount: successCount,
        errorCount: drops.length - successCount,
        errors: errors,
      };
    } catch (error) {
      throw new Error(`Batch commit failed: ${error}`);
    }
  }

  async getLawleyProjectId(): Promise<string> {
    const projectsCollection = collection(this.firestore, 'projects');
    const q = query(projectsCollection, where('code', '==', 'Law-001'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Lawley project (Law-001) not found');
    }

    return querySnapshot.docs[0].id;
  }
}
