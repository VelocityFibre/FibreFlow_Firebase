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
} from '@angular/fire/firestore';
import { Observable, from, map, throwError, switchMap } from 'rxjs';
import { HomeSignup } from '../../features/pole-tracker/models/pole-tracker.model';
import { PoleTrackerService } from '../../features/pole-tracker/services/pole-tracker.service';

/**
 * Home Signup Service with Data Integrity Enforcement (SPEC-DATA-001)
 *
 * Enforces:
 * - Drop number uniqueness across all drop collections
 * - Pole existence validation before assignment
 * - Pole capacity validation (max 12 drops per pole)
 * - Automatic pole relationship updates
 */

@Injectable({
  providedIn: 'root',
})
export class HomeSignupService {
  private firestore = inject(Firestore);
  private poleService = inject(PoleTrackerService);
  private collectionName = 'home-signups';

  /**
   * Create a new home signup with full data integrity validation
   */
  createHomeSignup(data: Partial<HomeSignup>): Observable<string> {
    // Validate required fields
    if (!data.dropNumber) {
      return throwError(() => new Error('Drop number is required'));
    }
    if (!data.connectedToPole) {
      return throwError(() => new Error('Connected pole is required'));
    }

    // Step 1: Validate drop number uniqueness
    return from(this.poleService.validateDropNumberUniqueness(data.dropNumber)).pipe(
      switchMap((isUnique) => {
        if (!isUnique) {
          return throwError(() => new Error(`Drop number ${data.dropNumber} already exists`));
        }

        // Step 2: Validate pole exists
        return from(this.poleService.validatePoleExists(data.connectedToPole!));
      }),
      switchMap((poleExists) => {
        if (!poleExists) {
          return throwError(() => new Error(`Pole ${data.connectedToPole} does not exist`));
        }

        // Step 3: Check pole capacity
        return from(this.poleService.checkPoleCapacity(data.connectedToPole!));
      }),
      switchMap((capacity) => {
        if (!capacity.canAddMore) {
          return throwError(
            () => new Error(`Pole ${data.connectedToPole} already has maximum 12 drops`),
          );
        }

        // Step 4: Create the home signup
        const homeSignupData: HomeSignup = {
          ...data,
          dropNumber: data.dropNumber!,
          connectedToPole: data.connectedToPole!,
          poleValidated: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as HomeSignup;

        const docRef = doc(collection(this.firestore, this.collectionName));
        return from(setDoc(docRef, homeSignupData)).pipe(
          switchMap(() => {
            // Step 5: Update pole's connected drops array
            return from(this.poleService.updatePoleConnectedDrops(data.connectedToPole!));
          }),
          map(() => docRef.id),
        );
      }),
    );
  }

  /**
   * Update home signup with validation
   */
  updateHomeSignup(id: string, data: Partial<HomeSignup>): Observable<void> {
    // Get current document to check for pole changes
    return from(getDoc(doc(this.firestore, this.collectionName, id))).pipe(
      switchMap((docSnap) => {
        if (!docSnap.exists()) {
          return throwError(() => new Error('Home signup not found'));
        }

        const currentData = docSnap.data() as HomeSignup;
        const isChangingPole =
          data.connectedToPole && data.connectedToPole !== currentData.connectedToPole;
        const isChangingDropNumber = data.dropNumber && data.dropNumber !== currentData.dropNumber;

        // Validate drop number uniqueness if changing
        if (isChangingDropNumber) {
          return from(this.poleService.validateDropNumberUniqueness(data.dropNumber!, id)).pipe(
            switchMap((isUnique) => {
              if (!isUnique) {
                return throwError(() => new Error(`Drop number ${data.dropNumber} already exists`));
              }
              return this.continueUpdate(id, data, currentData, isChangingPole);
            }),
          );
        }

        return this.continueUpdate(id, data, currentData, isChangingPole);
      }),
    );
  }

  private continueUpdate(
    id: string,
    data: Partial<HomeSignup>,
    currentData: HomeSignup,
    isChangingPole: boolean,
  ): Observable<void> {
    if (isChangingPole) {
      // Validate new pole exists and has capacity
      return from(this.poleService.validatePoleExists(data.connectedToPole!)).pipe(
        switchMap((poleExists) => {
          if (!poleExists) {
            return throwError(() => new Error(`Pole ${data.connectedToPole} does not exist`));
          }
          return from(this.poleService.checkPoleCapacity(data.connectedToPole!));
        }),
        switchMap((capacity) => {
          if (!capacity.canAddMore) {
            return throwError(
              () => new Error(`Pole ${data.connectedToPole} already has maximum 12 drops`),
            );
          }

          // Update the document
          const updateData = {
            ...data,
            poleValidated: true,
            updatedAt: serverTimestamp(),
          };

          return from(updateDoc(doc(this.firestore, this.collectionName, id), updateData)).pipe(
            switchMap(() => {
              // Update both old and new pole relationships
              const updates: Promise<void>[] = [];

              if (currentData.connectedToPole) {
                updates.push(
                  this.poleService.updatePoleConnectedDrops(currentData.connectedToPole),
                );
              }

              if (data.connectedToPole) {
                updates.push(this.poleService.updatePoleConnectedDrops(data.connectedToPole));
              }

              return from(Promise.all(updates));
            }),
            map(() => void 0),
          );
        }),
      );
    } else {
      // Simple update without pole change
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      return from(updateDoc(doc(this.firestore, this.collectionName, id), updateData));
    }
  }

  /**
   * Delete home signup and update pole relationships
   */
  deleteHomeSignup(id: string): Observable<void> {
    return from(getDoc(doc(this.firestore, this.collectionName, id))).pipe(
      switchMap((docSnap) => {
        if (!docSnap.exists()) {
          return throwError(() => new Error('Home signup not found'));
        }

        const data = docSnap.data() as HomeSignup;

        return from(deleteDoc(doc(this.firestore, this.collectionName, id))).pipe(
          switchMap(() => {
            // Update pole's connected drops array
            if (data.connectedToPole) {
              return from(this.poleService.updatePoleConnectedDrops(data.connectedToPole));
            }
            return from(Promise.resolve());
          }),
          map(() => void 0),
        );
      }),
    );
  }

  /**
   * Get all home signups
   */
  getAllHomeSignups(): Observable<HomeSignup[]> {
    const q = query(collection(this.firestore, this.collectionName), orderBy('createdAt', 'desc'));

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HomeSignup[];
      }),
    );
  }

  /**
   * Get home signups by pole
   */
  getHomeSignupsByPole(poleNumber: string): Observable<HomeSignup[]> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('connectedToPole', '==', poleNumber),
      orderBy('createdAt', 'desc'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HomeSignup[];
      }),
    );
  }

  /**
   * Get a single home signup
   */
  getHomeSignup(id: string): Observable<HomeSignup | null> {
    return from(getDoc(doc(this.firestore, this.collectionName, id))).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...docSnap.data(),
          } as HomeSignup;
        }
        return null;
      }),
    );
  }

  /**
   * Bulk import home signups with validation
   */
  bulkImportHomeSignups(homeSignups: Partial<HomeSignup>[]): Observable<{
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    const results = {
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
    };

    const promises = homeSignups.map(async (homeSignup, index) => {
      try {
        await this.createHomeSignup(homeSignup).toPromise();
        results.successCount++;
      } catch (error: any) {
        results.errorCount++;
        results.errors.push(`Row ${index + 1}: ${error.message}`);
      }
    });

    return from(Promise.all(promises)).pipe(map(() => results));
  }

  /**
   * Validate home signup data before import
   */
  validateHomeSignupData(homeSignups: Partial<HomeSignup>[]): Observable<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    const validatePromises = homeSignups.map(async (homeSignup, index) => {
      const row = index + 1;

      // Check required fields
      if (!homeSignup.dropNumber) {
        validation.errors.push(`Row ${row}: Drop number is required`);
        validation.isValid = false;
      }

      if (!homeSignup.connectedToPole) {
        validation.errors.push(`Row ${row}: Connected pole is required`);
        validation.isValid = false;
      }

      if (!homeSignup.address) {
        validation.errors.push(`Row ${row}: Address is required`);
        validation.isValid = false;
      }

      // Validate data if required fields exist
      if (homeSignup.dropNumber && homeSignup.connectedToPole) {
        try {
          // Check drop number uniqueness
          const isDropUnique = await this.poleService.validateDropNumberUniqueness(
            homeSignup.dropNumber,
          );
          if (!isDropUnique) {
            validation.errors.push(
              `Row ${row}: Drop number ${homeSignup.dropNumber} already exists`,
            );
            validation.isValid = false;
          }

          // Check pole exists
          const poleExists = await this.poleService.validatePoleExists(homeSignup.connectedToPole);
          if (!poleExists) {
            validation.errors.push(`Row ${row}: Pole ${homeSignup.connectedToPole} does not exist`);
            validation.isValid = false;
          } else {
            // Check pole capacity
            const capacity = await this.poleService.checkPoleCapacity(homeSignup.connectedToPole);
            if (!capacity.canAddMore) {
              validation.errors.push(
                `Row ${row}: Pole ${homeSignup.connectedToPole} already has maximum 12 drops`,
              );
              validation.isValid = false;
            } else if (capacity.count >= 10) {
              validation.warnings.push(
                `Row ${row}: Pole ${homeSignup.connectedToPole} is near capacity (${capacity.count}/12 drops)`,
              );
            }
          }
        } catch (error: any) {
          validation.errors.push(`Row ${row}: Validation error - ${error.message}`);
          validation.isValid = false;
        }
      }
    });

    return from(Promise.all(validatePromises)).pipe(map(() => validation));
  }
}
