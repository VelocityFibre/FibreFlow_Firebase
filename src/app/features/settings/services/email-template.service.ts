import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  setDoc,
  query,
  where,
  collectionData,
  serverTimestamp,
  deleteDoc,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  EmailTemplate,
  EmailTemplateType,
  DEFAULT_RFQ_TEMPLATE,
} from '../models/email-template.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class EmailTemplateService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private readonly COLLECTION = 'emailTemplates';

  getTemplates(): Observable<EmailTemplate[]> {
    const templatesRef = collection(this.firestore, this.COLLECTION);

    return collectionData(templatesRef, { idField: 'id' }).pipe(
      map((templates) => {
        if (!templates || templates.length === 0) {
          // Return default template if none exist
          return [{ ...DEFAULT_RFQ_TEMPLATE, id: 'default-rfq' } as EmailTemplate];
        }
        return templates as EmailTemplate[];
      }),
      catchError((error) => {
        console.error('Error fetching email templates:', error);
        return of([{ ...DEFAULT_RFQ_TEMPLATE, id: 'default-rfq' } as EmailTemplate]);
      }),
    );
  }

  getTemplateByType(type: EmailTemplateType): Observable<EmailTemplate | null> {
    const templatesRef = collection(this.firestore, this.COLLECTION);
    const q = query(templatesRef, where('type', '==', type), where('isActive', '==', true));

    return collectionData(q, { idField: 'id' }).pipe(
      map((templates) => {
        if (!templates || templates.length === 0) {
          if (type === EmailTemplateType.RFQ) {
            return { ...DEFAULT_RFQ_TEMPLATE, id: 'default-rfq' } as EmailTemplate;
          }
          return null;
        }
        return templates[0] as EmailTemplate;
      }),
      catchError((error) => {
        console.error('Error fetching template by type:', error);
        if (type === EmailTemplateType.RFQ) {
          return of({ ...DEFAULT_RFQ_TEMPLATE, id: 'default-rfq' } as EmailTemplate);
        }
        return of(null);
      }),
    );
  }

  async saveTemplate(template: Partial<EmailTemplate>): Promise<string> {
    try {
      const currentUser = await this.authService.getCurrentUser();
      const templateId = template.id || doc(collection(this.firestore, 'temp')).id;
      const docRef = doc(this.firestore, this.COLLECTION, templateId);

      const dataToSave = {
        ...template,
        id: templateId,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system',
      };

      if (!template.id) {
        (dataToSave as any).createdAt = serverTimestamp();
      }

      await setDoc(docRef, dataToSave, { merge: true });
      return templateId;
    } catch (error) {
      console.error('Error saving email template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.COLLECTION, templateId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting email template:', error);
      throw error;
    }
  }

  previewTemplate(template: EmailTemplate, sampleData: Record<string, string>): string {
    let preview = template.body;

    // Replace all variables with sample data
    template.variables.forEach((variable) => {
      const value = sampleData[variable.key] || variable.example;
      preview = preview.replace(new RegExp(variable.key, 'g'), value);
    });

    return preview;
  }
}
