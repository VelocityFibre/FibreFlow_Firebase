import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  serverTimestamp,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError } from 'rxjs';
import {
  PoleTracker,
  PoleTrackerFilter,
  PoleTrackerStats,
  PoleType,
  PoleTrackerListItem,
} from '../models/pole-tracker.model';
import { ProjectService } from '../../../core/services/project.service';

@Injectable({
  providedIn: 'root',
})
export class PoleTrackerService {
  private firestore = inject(Firestore);
  private projectService = inject(ProjectService);
  private collectionName = 'pole-trackers';

  // Generate VF Pole ID based on project code
  async generateVFPoleId(projectId: string): Promise<string> {
    // Get project code
    const projectDoc = await getDoc(doc(this.firestore, 'projects', projectId));
    const project = projectDoc.data();
    if (!project) throw new Error('Project not found');

    // Get project code or use first 3 letters of name
    const prefix = project['projectCode'] || project['name'].substring(0, 3).toUpperCase();

    // Get count of existing poles for this project
    const polesQuery = query(
      collection(this.firestore, this.collectionName),
      where('projectId', '==', projectId),
    );
    const snapshot = await getDocs(polesQuery);
    const count = snapshot.size + 1;

    // Format: LAW.P.A001
    const poleNumber = count.toString().padStart(3, '0');
    return `${prefix}.P.A${poleNumber}`;
  }

  // Create a new pole tracker entry
  createPoleTracker(data: Partial<PoleTracker>): Observable<string> {
    return from(this.generateVFPoleId(data.projectId!)).pipe(
      switchMap((vfPoleId) => {
        const poleData: PoleTracker = {
          ...data,
          vfPoleId,
          uploads: {
            before: { uploaded: false },
            front: { uploaded: false },
            side: { uploaded: false },
            depth: { uploaded: false },
            concrete: { uploaded: false },
            compaction: { uploaded: false },
          },
          qualityChecked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as PoleTracker;

        const docRef = doc(collection(this.firestore, this.collectionName));
        return from(setDoc(docRef, poleData)).pipe(map(() => docRef.id));
      }),
    );
  }

  // Get all pole trackers with optional filter
  getPoleTrackers(filter?: PoleTrackerFilter): Observable<PoleTrackerListItem[]> {
    let q = query(collection(this.firestore, this.collectionName));

    // Apply filters
    if (filter?.projectId) {
      q = query(q, where('projectId', '==', filter.projectId));
    }
    if (filter?.contractorId) {
      q = query(q, where('contractorId', '==', filter.contractorId));
    }
    if (filter?.workingTeam) {
      q = query(q, where('workingTeam', '==', filter.workingTeam));
    }
    if (filter?.poleType) {
      q = query(q, where('poleType', '==', filter.poleType));
    }
    if (filter?.qualityChecked !== undefined) {
      q = query(q, where('qualityChecked', '==', filter.qualityChecked));
    }

    // Order by date installed (newest first)
    q = query(q, orderBy('dateInstalled', 'desc'));

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          const data = { id: doc.id, ...doc.data() } as PoleTracker;

          // Calculate upload progress
          const uploads = data.uploads;
          const totalUploads = 6;
          const completedUploads = Object.values(uploads).filter((u) => u.uploaded).length;
          const uploadProgress = (completedUploads / totalUploads) * 100;

          return {
            ...data,
            uploadProgress,
            allUploadsComplete: completedUploads === totalUploads,
          } as PoleTrackerListItem;
        });
      }),
    );
  }

  // Get a single pole tracker
  getPoleTracker(id: string): Observable<PoleTracker | null> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as PoleTracker;
        }
        return null;
      }),
    );
  }

  // Update pole tracker
  updatePoleTracker(id: string, data: Partial<PoleTracker>): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(docRef, updateData));
  }

  // Update image upload status
  updateImageUpload(
    poleId: string,
    uploadType: keyof PoleTracker['uploads'],
    uploadData: Partial<PoleTracker['uploads'][keyof PoleTracker['uploads']]>,
  ): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, poleId);
    const updateData = {
      [`uploads.${uploadType}`]: uploadData,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(docRef, updateData));
  }

  // Mark quality check
  markQualityChecked(
    poleId: string,
    checkedBy: string,
    checkedByName: string,
    notes?: string,
  ): Observable<void> {
    const updateData: any = {
      qualityChecked: true,
      qualityCheckedBy: checkedBy,
      qualityCheckedByName: checkedByName,
      qualityCheckDate: serverTimestamp(),
      qualityCheckNotes: notes || '',
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, this.collectionName, poleId), updateData));
  }

  // Delete pole tracker
  deletePoleTracker(id: string): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return from(deleteDoc(docRef));
  }

  // Get statistics for a project
  getPoleTrackerStats(projectId: string): Observable<PoleTrackerStats> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('projectId', '==', projectId),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const poles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as PoleTracker);

        const stats: PoleTrackerStats = {
          totalPoles: poles.length,
          installedPoles: poles.filter((p) => p.dateInstalled).length,
          qualityCheckedPoles: poles.filter((p) => p.qualityChecked).length,
          polesWithAllUploads: poles.filter((p) => {
            const uploads = Object.values(p.uploads);
            return uploads.every((u) => u.uploaded);
          }).length,
          polesByType: {},
          polesByContractor: {},
          installationProgress: 0,
        };

        // Count by type
        poles.forEach((pole) => {
          if (pole.poleType) {
            stats.polesByType[pole.poleType] = (stats.polesByType[pole.poleType] || 0) + 1;
          }

          // Count by contractor
          if (pole.contractorId) {
            if (!stats.polesByContractor[pole.contractorId]) {
              stats.polesByContractor[pole.contractorId] = {
                name: pole.contractorName || pole.contractorId,
                count: 0,
              };
            }
            stats.polesByContractor[pole.contractorId].count++;
          }
        });

        // Calculate progress (will need total expected poles from project)
        stats.installationProgress =
          stats.totalPoles > 0 ? Math.round((stats.installedPoles / stats.totalPoles) * 100) : 0;

        return stats;
      }),
    );
  }

  // Bulk create poles (for CSV import - future feature)
  bulkCreatePoles(projectId: string, polesData: Partial<PoleTracker>[]): Observable<string[]> {
    // Implementation for Phase 2
    return of([]);
  }
}
