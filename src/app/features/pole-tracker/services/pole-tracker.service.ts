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
  limit,
  getDocs,
  getDoc,
  getCountFromServer,
  serverTimestamp,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError, throwError } from 'rxjs';
import {
  PoleTracker,
  PoleTrackerFilter,
  PoleTrackerStats,
  PoleType,
  PoleTrackerListItem,
  HomeSignup,
  HomesConnected,
  HomesActivated,
} from '../models/pole-tracker.model';
import { PlannedPole, PoleInstallation, ImportBatch } from '../models/mobile-pole-tracker.model';
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

  // Data Integrity Validation Methods (SPEC-DATA-001)

  // Validate pole number uniqueness across all pole collections
  async validatePoleNumberUniqueness(poleNumber: string, excludeId?: string): Promise<boolean> {
    const collections = ['pole-trackers', 'planned-poles'];

    for (const collectionName of collections) {
      const q = query(
        collection(this.firestore, collectionName),
        where('poleNumber', '==', poleNumber),
      );

      const snapshot = await getDocs(q);

      // If we find any document with this pole number
      if (!snapshot.empty) {
        // If we're updating and this is the same document, it's okay
        if (excludeId && snapshot.docs.some((doc) => doc.id === excludeId)) {
          continue;
        }
        return false; // Pole number already exists
      }
    }

    return true; // Pole number is unique
  }

  // Validate drop number uniqueness across all drop collections
  async validateDropNumberUniqueness(dropNumber: string, excludeId?: string): Promise<boolean> {
    const collections = ['home-signups', 'homes-connected', 'homes-activated'];

    for (const collectionName of collections) {
      const q = query(
        collection(this.firestore, collectionName),
        where('dropNumber', '==', dropNumber),
      );

      const snapshot = await getDocs(q);

      // If we find any document with this drop number
      if (!snapshot.empty) {
        // If we're updating and this is the same document, it's okay
        if (excludeId && snapshot.docs.some((doc) => doc.id === excludeId)) {
          continue;
        }
        return false; // Drop number already exists
      }
    }

    return true; // Drop number is unique
  }

  // Check pole capacity (max 12 drops)
  async checkPoleCapacity(poleNumber: string): Promise<{ count: number; canAddMore: boolean }> {
    const collections = ['home-signups', 'homes-connected', 'homes-activated'];
    let totalDrops = 0;

    for (const collectionName of collections) {
      const q = query(
        collection(this.firestore, collectionName),
        where('connectedToPole', '==', poleNumber),
      );

      const snapshot = await getDocs(q);
      totalDrops += snapshot.size;
    }

    return {
      count: totalDrops,
      canAddMore: totalDrops < 12,
    };
  }

  // Validate pole exists for drop assignment
  async validatePoleExists(poleNumber: string): Promise<boolean> {
    const collections = ['pole-trackers', 'planned-poles'];

    for (const collectionName of collections) {
      const q = query(
        collection(this.firestore, collectionName),
        where('poleNumber', '==', poleNumber),
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return true; // Pole exists
      }
    }

    return false; // Pole not found
  }

  // Update pole's connected drops array
  async updatePoleConnectedDrops(poleNumber: string): Promise<void> {
    // Get all drops connected to this pole
    const collections = ['home-signups', 'homes-connected', 'homes-activated'];
    const connectedDrops: string[] = [];

    for (const collectionName of collections) {
      const q = query(
        collection(this.firestore, collectionName),
        where('connectedToPole', '==', poleNumber),
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data['dropNumber']) {
          connectedDrops.push(data['dropNumber']);
        }
      });
    }

    // Update pole record with connected drops
    const poleCollections = ['pole-trackers', 'planned-poles'];

    for (const collectionName of poleCollections) {
      const q = query(
        collection(this.firestore, collectionName),
        where('poleNumber', '==', poleNumber),
      );

      const snapshot = await getDocs(q);
      snapshot.docs.forEach(async (poleDoc) => {
        await updateDoc(poleDoc.ref, {
          connectedDrops: connectedDrops,
          dropCount: connectedDrops.length,
          updatedAt: serverTimestamp(),
        });
      });
    }
  }

  // Create a new pole tracker entry with validation
  createPoleTracker(data: Partial<PoleTracker>): Observable<string> {
    // Validate required fields
    if (!data.poleNumber) {
      return throwError(() => new Error('Pole number is required'));
    }

    // Validate pole number uniqueness
    return from(this.validatePoleNumberUniqueness(data.poleNumber)).pipe(
      switchMap((isUnique) => {
        if (!isUnique) {
          return throwError(() => new Error(`Pole number ${data.poleNumber} already exists`));
        }

        return from(this.generateVFPoleId(data.projectId!));
      }),
      switchMap((vfPoleId) => {
        const poleData: PoleTracker = {
          ...data,
          vfPoleId,
          poleNumber: data.poleNumber!,
          connectedDrops: [],
          dropCount: 0,
          maxCapacity: 12,
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
        } as any;

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
            uploadedCount: completedUploads,
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

  // Update pole tracker with validation
  updatePoleTracker(id: string, data: Partial<PoleTracker>): Observable<void> {
    // If updating pole number, validate uniqueness
    if (data.poleNumber) {
      return from(this.validatePoleNumberUniqueness(data.poleNumber, id)).pipe(
        switchMap((isUnique) => {
          if (!isUnique) {
            return throwError(() => new Error(`Pole number ${data.poleNumber} already exists`));
          }

          const docRef = doc(this.firestore, this.collectionName, id);
          const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
          };
          return from(updateDoc(docRef, updateData));
        }),
      );
    }

    // Regular update without pole number change
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
          poleCapacityStats: {
            totalDrops: 0,
            polesAtCapacity: 0,
            polesNearCapacity: 0,
            averageDropsPerPole: 0,
            capacityUtilization: 0,
          },
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

        // Calculate pole capacity statistics
        const totalDrops = poles.reduce((sum, pole) => sum + (pole.dropCount || 0), 0);
        const polesAtCapacity = poles.filter((pole) => (pole.dropCount || 0) >= 12).length;
        const polesNearCapacity = poles.filter((pole) => (pole.dropCount || 0) >= 10).length;
        const averageDropsPerPole = stats.totalPoles > 0 ? totalDrops / stats.totalPoles : 0;
        const maxPossibleDrops = stats.totalPoles * 12;
        const capacityUtilization =
          maxPossibleDrops > 0 ? (totalDrops / maxPossibleDrops) * 100 : 0;

        stats.poleCapacityStats = {
          totalDrops,
          polesAtCapacity,
          polesNearCapacity,
          averageDropsPerPole: Math.round(averageDropsPerPole * 100) / 100,
          capacityUtilization: Math.round(capacityUtilization * 100) / 100,
        };

        return stats;
      }),
    );
  }

  // Get all planned poles (for mobile app)
  getAllPlannedPoles(): Observable<PlannedPole[]> {
    const q = query(collection(this.firestore, 'planned-poles'));
    // TODO: Add orderBy('poleNumber') after creating single-field index

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as PlannedPole,
        );
      }),
      catchError((error) => {
        console.error('Error fetching planned poles:', error);
        return of([]);
      }),
    );
  }

  // Get planned poles by project
  getPlannedPolesByProject(projectId: string): Observable<PlannedPole[]> {
    const q = query(
      collection(this.firestore, 'planned-poles'),
      where('projectId', '==', projectId),
      // TODO: Add orderBy('poleNumber') after creating composite index
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as PlannedPole,
        );
      }),
      catchError((error) => {
        console.error('Error fetching planned poles:', error);
        return of([]);
      }),
    );
  }

  // Get a specific planned pole
  getPlannedPoleById(poleId: string): Observable<PlannedPole | null> {
    const docRef = doc(this.firestore, 'planned-poles', poleId);

    return from(getDoc(docRef)).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...docSnap.data(),
          } as PlannedPole;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error fetching planned pole:', error);
        return of(null);
      }),
    );
  }

  // PERFORMANCE OPTIMIZATION: Paginated query for planned poles
  getPlannedPolesByProjectPaginated(
    projectId: string,
    pageSize: number = 50,
    pageIndex: number = 0,
  ): Observable<{ poles: PlannedPole[]; total: number }> {
    // Get all poles for this project (we'll paginate client-side for now)
    const q = query(
      collection(this.firestore, 'planned-poles'),
      where('projectId', '==', projectId),
      // Note: orderBy requires composite index, removed for now
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const allPoles = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as PlannedPole,
        );

        // Calculate pagination
        const total = allPoles.length;
        const startIndex = pageIndex * pageSize;
        const endIndex = startIndex + pageSize;

        // Get the current page of poles
        const paginatedPoles = allPoles.slice(startIndex, endIndex);

        return {
          poles: paginatedPoles,
          total: total,
        };
      }),
      catchError((error) => {
        console.error('Error fetching paginated planned poles:', error);
        return of({ poles: [], total: 0 });
      }),
    );
  }

  // Get count of planned poles for a project
  getPlannedPolesCount(projectId: string): Observable<number> {
    const q = query(
      collection(this.firestore, 'planned-poles'),
      where('projectId', '==', projectId),
    );

    return from(getCountFromServer(q)).pipe(
      map((snapshot) => snapshot.data().count),
      catchError((error) => {
        console.error('Error fetching poles count:', error);
        return of(0);
      }),
    );
  }

  // Create pole installation from planned pole
  //   // Commented out duplicate - see line 400
  //   // createPoleInstallation(installation: Partial<PoleInstallation>): Observable<string> {
  //     const docRef = doc(collection(this.firestore, 'pole-installations'));
  //     const installationData = {
  //       ...installation,
  //       createdAt: serverTimestamp(),
  //       updatedAt: serverTimestamp()
  //     };
  //
  //     return from(setDoc(docRef, installationData)).pipe(
  //       map(() => docRef.id),
  //       catchError(error => {
  //         console.error('Error creating pole installation:', error);
  //         throw error;
  //       })
  //     );
  //   }
  //
  //   // Bulk create poles (for CSV import - future feature)
  //   bulkCreatePoles(projectId: string, polesData: Partial<PoleTracker>[]): Observable<string[]> {
  //     // Implementation for Phase 2
  //     return of([]);
  //   }
  //
  //   // Import poles from CSV/Excel
  importPoles(
    projectId: string,
    poles: Partial<PlannedPole>[],
    importedBy: string,
    fileName: string,
  ): Observable<ImportBatch> {
    const batch: ImportBatch = {
      id: doc(collection(this.firestore, 'import-batches')).id,
      projectId,
      fileName,
      importedBy,
      importDate: serverTimestamp() as Timestamp,
      totalPoles: poles.length,
      successCount: 0,
      errorCount: 0,
      status: 'processing',
      errors: [],
    };

    const plannedPolesRef = collection(this.firestore, 'planned-poles');
    const promises: Promise<any>[] = [];

    poles.forEach((pole, index) => {
      const plannedPole: Partial<PlannedPole> = {
        ...pole,
        projectId,
        importBatchId: batch.id,
        importDate: serverTimestamp() as Timestamp,
        status: 'planned' as any,
        metadata: {
          importedBy,
          importFileName: fileName,
          rowNumber: index + 2, // Assuming row 1 is headers
          originalData: pole as any,
        },
      };

      const promise = setDoc(doc(plannedPolesRef), plannedPole)
        .then(() => {
          batch.successCount++;
        })
        .catch((error) => {
          batch.errorCount++;
          batch.errors.push(`Row ${index + 2}: ${error.message}`);
        });

      promises.push(promise);
    });

    return from(Promise.all(promises)).pipe(
      switchMap(() => {
        batch.status =
          batch.errorCount === 0 ? 'completed' : batch.successCount === 0 ? 'failed' : 'partial';
        return from(setDoc(doc(this.firestore, 'import-batches', batch.id), batch));
      }),
      map(() => batch),
    );
  }

  // Get all planned poles
  //   getAllPlannedPoles(): Observable<PlannedPole[]> {
  //     const plannedPolesRef = collection(this.firestore, 'planned-poles');
  //     const q = query(plannedPolesRef, orderBy('importDate', 'desc'));
  //
  //     return from(getDocs(q)).pipe(
  //       map(snapshot => {
  //         return snapshot.docs.map(doc => ({
  //           id: doc.id,
  //           ...doc.data()
  //         } as PlannedPole));
  //       })
  //     );
  //   }
}
