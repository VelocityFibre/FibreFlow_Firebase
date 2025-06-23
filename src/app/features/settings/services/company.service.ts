import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CompanyInfo, DEFAULT_COMPANY_INFO } from '../models/company.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private readonly COMPANY_DOC_ID = 'company-info';
  private readonly COLLECTION = 'settings';

  getCompanyInfo(): Observable<CompanyInfo> {
    const docRef = doc(this.firestore, this.COLLECTION, this.COMPANY_DOC_ID);

    return docData(docRef).pipe(
      map((data) => {
        if (!data) {
          // Return default company info if none exists
          return { ...DEFAULT_COMPANY_INFO } as CompanyInfo;
        }
        return data as CompanyInfo;
      }),
      catchError((error) => {
        console.error('Error fetching company info:', error);
        return of({ ...DEFAULT_COMPANY_INFO } as CompanyInfo);
      }),
    );
  }

  async updateCompanyInfo(companyInfo: Partial<CompanyInfo>): Promise<void> {
    try {
      const currentUser = await this.authService.getCurrentUser();
      const docRef = doc(this.firestore, this.COLLECTION, this.COMPANY_DOC_ID);

      const dataToSave = {
        ...companyInfo,
        id: this.COMPANY_DOC_ID,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system',
      };

      await setDoc(docRef, dataToSave, { merge: true });
    } catch (error) {
      console.error('Error updating company info:', error);
      throw error;
    }
  }

  async uploadLogo(_file: File): Promise<string> {
    // TODO: Implement logo upload to Firebase Storage
    // For now, return a placeholder
    return Promise.resolve('/assets/images/logo-placeholder.png');
  }
}
