import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { EmailLog, EmailSettings } from '../models/email.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class EmailLogService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private emailLogsCollection = 'emailLogs';
  private emailSettingsDoc = 'emailSettings';

  // Create email log
  async createEmailLog(emailData: Partial<EmailLog>): Promise<string> {
    const user = this.authService.getCurrentUser();

    const emailLog: Omit<EmailLog, 'id'> = {
      to: emailData.to || [],
      from: emailData.from || 'noreply@velocityfibre.com',
      fromName: emailData.fromName || 'Velocity Fibre',
      subject: emailData.subject || '',
      text: emailData.text || '',
      html: emailData.html || '',
      type: emailData.type || 'general',
      status: 'draft',
      confirmationRequired: emailData.confirmationRequired ?? true,
      createdBy: user?.uid || 'system',
      createdByName: user?.displayName || 'System',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...emailData,
    };

    const docRef = await addDoc(collection(this.firestore, this.emailLogsCollection), emailLog);
    return docRef.id;
  }

  // Get email logs with filtering
  getEmailLogs(filters?: {
    projectId?: string;
    type?: string;
    status?: string;
    relatedId?: string;
    limit?: number;
  }): Observable<EmailLog[]> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

    if (filters?.projectId) {
      constraints.push(where('projectId', '==', filters.projectId));
    }
    if (filters?.type) {
      constraints.push(where('type', '==', filters.type));
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters?.relatedId) {
      constraints.push(where('relatedId', '==', filters.relatedId));
    }
    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(collection(this.firestore, this.emailLogsCollection), ...constraints);

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as EmailLog,
        ),
      ),
    );
  }

  // Get single email log
  getEmailLog(emailId: string): Observable<EmailLog | null> {
    return from(getDoc(doc(this.firestore, this.emailLogsCollection, emailId))).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as EmailLog;
        }
        return null;
      }),
    );
  }

  // Update email log status
  async updateEmailStatus(emailId: string, updates: Partial<EmailLog>): Promise<void> {
    await updateDoc(doc(this.firestore, this.emailLogsCollection, emailId), {
      ...updates,
      updatedAt: new Date(),
    });
  }

  // Confirm email for sending
  async confirmEmail(emailId: string): Promise<void> {
    const user = this.authService.getCurrentUser();

    await this.updateEmailStatus(emailId, {
      status: 'queued',
      confirmedBy: user?.uid,
      confirmedAt: new Date(),
    });
  }

  // Cancel email
  async cancelEmail(emailId: string): Promise<void> {
    await this.updateEmailStatus(emailId, {
      status: 'cancelled',
    });
  }

  // Create and send email to mail collection
  async sendEmail(emailLog: EmailLog): Promise<string> {
    // Create the email document for the Firebase Email Extension
    const emailDoc = {
      to: emailLog.to,
      cc: emailLog.cc,
      bcc: emailLog.bcc,
      from: `${emailLog.fromName} <${emailLog.from}>`,
      message: {
        subject: emailLog.subject,
        text: emailLog.text,
        html: emailLog.html,
        attachments: emailLog.attachments,
      },
    };

    // Add to mail collection
    const mailDocRef = await addDoc(collection(this.firestore, 'mail'), emailDoc);

    // Update email log with mail document ID
    await this.updateEmailStatus(emailLog.id!, {
      status: 'sending',
      mailDocumentId: mailDocRef.id,
      sentAt: new Date(),
    });

    // Monitor delivery status
    this.monitorEmailDelivery(emailLog.id!, mailDocRef.id);

    return mailDocRef.id;
  }

  // Monitor email delivery status
  private monitorEmailDelivery(emailLogId: string, mailDocId: string): void {
    const unsubscribe = onSnapshot(doc(this.firestore, 'mail', mailDocId), async (snapshot) => {
      const data = snapshot.data();

      if (data?.['delivery']) {
        if (data['delivery'].state === 'SUCCESS') {
          await this.updateEmailStatus(emailLogId, {
            status: 'sent',
            deliveredAt: new Date(),
          });
          unsubscribe();
        } else if (data['delivery'].state === 'ERROR') {
          await this.updateEmailStatus(emailLogId, {
            status: 'failed',
            failedAt: new Date(),
            errorMessage: data['delivery'].error,
            attempts: data['delivery'].attempts || 1,
          });
          unsubscribe();
        }
      }
    });

    // Stop monitoring after 5 minutes
    setTimeout(() => unsubscribe(), 5 * 60 * 1000);
  }

  // Resend email
  async resendEmail(originalEmailId: string): Promise<string> {
    const originalEmail = await this.getEmailLog(originalEmailId).toPromise();

    if (!originalEmail) {
      throw new Error('Original email not found');
    }

    // Create new email log for resend
    const newEmailId = await this.createEmailLog({
      ...originalEmail,
      id: undefined,
      originalEmailId: originalEmailId,
      resendCount: (originalEmail.resendCount || 0) + 1,
      lastResentAt: new Date(),
      status: 'pending_confirmation',
      confirmedBy: undefined,
      confirmedAt: undefined,
      sentAt: undefined,
      deliveredAt: undefined,
      failedAt: undefined,
      errorMessage: undefined,
      mailDocumentId: undefined,
    });

    return newEmailId;
  }

  // Get email settings
  async getEmailSettings(): Promise<EmailSettings> {
    const docSnap = await getDoc(doc(this.firestore, 'settings', this.emailSettingsDoc));

    if (docSnap.exists()) {
      return docSnap.data() as EmailSettings;
    }

    // Return defaults
    return {
      defaultFrom: 'noreply@velocityfibre.com',
      defaultFromName: 'Velocity Fibre',
      requireConfirmation: true,
    };
  }

  // Update email settings
  async updateEmailSettings(settings: Partial<EmailSettings>): Promise<void> {
    await updateDoc(doc(this.firestore, 'settings', this.emailSettingsDoc), settings);
  }
}
