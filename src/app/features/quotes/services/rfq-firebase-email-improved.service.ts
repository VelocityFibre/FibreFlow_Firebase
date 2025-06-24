import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, from, of, forkJoin, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap, take, finalize, tap } from 'rxjs/operators';
import { RFQ } from '../models/rfq.model';
import { Supplier } from '../../../core/suppliers/models/supplier.model';
import { BOQItem } from '../../boq/models/boq.model';
import { NotificationService } from '../../../core/services/notification.service';
import { RFQService } from './rfq.service';
import { RFQPDFService } from './rfq-pdf.service';
import { AuthService } from '../../../core/services/auth.service';
import { EmailTemplateService } from '../../settings/services/email-template.service';
import { CompanyService } from '../../settings/services/company.service';
import { EmailTemplateType } from '../../settings/models/email-template.model';

interface EmailDeliveryStatus {
  rfqId: string;
  totalEmails: number;
  sent: number;
  failed: number;
  pending: number;
  status: 'idle' | 'sending' | 'completed' | 'error';
}

@Injectable({
  providedIn: 'root',
})
export class RFQFirebaseEmailImprovedService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);
  private rfqService = inject(RFQService);
  private rfqPDFService = inject(RFQPDFService);
  private authService = inject(AuthService);
  private emailTemplateService = inject(EmailTemplateService);
  private companyService = inject(CompanyService);

  // Track sending status to prevent multiple sends
  private sendingStatus = new Map<string, BehaviorSubject<EmailDeliveryStatus>>();

  // Maximum PDF size in KB (10MB)
  private readonly MAX_PDF_SIZE_KB = 10240;

  // Email batch size for large recipient lists
  private readonly BATCH_SIZE = 10;

  /**
   * Get or create sending status for an RFQ
   */
  private getSendingStatus(rfqId: string): BehaviorSubject<EmailDeliveryStatus> {
    if (!this.sendingStatus.has(rfqId)) {
      this.sendingStatus.set(
        rfqId,
        new BehaviorSubject<EmailDeliveryStatus>({
          rfqId,
          totalEmails: 0,
          sent: 0,
          failed: 0,
          pending: 0,
          status: 'idle',
        }),
      );
    }
    return this.sendingStatus.get(rfqId)!;
  }

  /**
   * Check if RFQ is currently being sent
   */
  isRFQBeingSent(rfqId: string): Observable<boolean> {
    return this.getSendingStatus(rfqId).pipe(map((status) => status.status === 'sending'));
  }

  /**
   * Get delivery status for an RFQ
   */
  getDeliveryStatus(rfqId: string): Observable<EmailDeliveryStatus> {
    return this.getSendingStatus(rfqId).asObservable();
  }

  /**
   * Send RFQ to suppliers with improved error handling and duplicate prevention
   */
  sendRFQToSuppliers(rfq: RFQ, suppliers: Supplier[], items: BOQItem[]): Observable<boolean> {
    const status$ = this.getSendingStatus(rfq.id!);
    const currentStatus = status$.value;

    // Prevent multiple simultaneous sends
    if (currentStatus.status === 'sending') {
      this.notificationService.warning('RFQ is already being sent. Please wait...');
      return of(false);
    }

    // Update status to sending
    status$.next({
      ...currentStatus,
      status: 'sending',
      totalEmails: suppliers.length,
      pending: suppliers.length,
      sent: 0,
      failed: 0,
    });

    // Get template and company info
    return forkJoin([
      this.emailTemplateService.getTemplateByType(EmailTemplateType.RFQ).pipe(take(1)),
      this.companyService.getCompanyInfo().pipe(take(1)),
    ]).pipe(
      switchMap(([template, companyInfo]) => {
        // Generate PDF with size validation
        const pdfDoc = this.rfqPDFService.generateRFQPDF(rfq, items, suppliers);
        const pdfBase64 = this.rfqPDFService.getPDFAsBase64(pdfDoc);

        // Validate PDF size
        const pdfSizeKB = (pdfBase64.length * 0.75) / 1024;
        console.log(`RFQ PDF size: ${pdfSizeKB.toFixed(2)}KB`);

        if (pdfSizeKB > this.MAX_PDF_SIZE_KB) {
          this.notificationService.error(
            `PDF size (${(pdfSizeKB / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(this.MAX_PDF_SIZE_KB / 1024).toFixed(0)}MB)`,
          );
          status$.next({ ...status$.value, status: 'error' });
          return of(false);
        }

        const currentUser = this.authService.getCurrentUser();
        const fromEmail = 'noreply@velocityfibre.com';
        const fromName =
          currentUser?.displayName || companyInfo.companyName || 'FibreFlow Procurement';

        // Process suppliers in batches
        const batches = this.createBatches(suppliers, this.BATCH_SIZE);

        // Send emails batch by batch
        return from(
          this.sendBatches(
            batches,
            rfq,
            items,
            template,
            companyInfo,
            pdfBase64,
            pdfSizeKB,
            fromEmail,
            fromName,
            status$,
          ),
        ).pipe(
          switchMap((results) => {
            const successCount = results.filter((r) => r).length;
            const failCount = results.filter((r) => !r).length;

            if (successCount > 0) {
              // Update RFQ status
              return this.rfqService
                .updateRFQ(rfq.id!, {
                  status: 'sent',
                  sentAt: new Date(),
                  lastSentCount: successCount,
                  totalSentCount: (rfq.totalSentCount || 0) + successCount,
                } as Partial<RFQ>)
                .pipe(
                  map(() => {
                    const message =
                      failCount > 0
                        ? `RFQ sent to ${successCount} supplier(s), ${failCount} failed.`
                        : `RFQ successfully sent to ${successCount} supplier(s).`;

                    this.notificationService.success(message);
                    return true;
                  }),
                );
            } else {
              this.notificationService.error('Failed to send RFQ to any suppliers');
              return of(false);
            }
          }),
          finalize(() => {
            // Update final status
            const finalStatus = status$.value;
            status$.next({
              ...finalStatus,
              status: finalStatus.failed === finalStatus.totalEmails ? 'error' : 'completed',
            });

            // Clean up status after 5 minutes
            setTimeout(
              () => {
                this.sendingStatus.delete(rfq.id!);
              },
              5 * 60 * 1000,
            );
          }),
          catchError((error) => {
            console.error('Error in sendRFQToSuppliers:', error);
            status$.next({ ...status$.value, status: 'error' });
            this.notificationService.error('Failed to process RFQ emails');
            return of(false);
          }),
        );
      }),
    );
  }

  /**
   * Create batches of suppliers for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Send emails in batches with proper error handling
   */
  private async sendBatches(
    batches: Supplier[][],
    rfq: RFQ,
    items: BOQItem[],
    template: any,
    companyInfo: any,
    pdfBase64: string,
    pdfSizeKB: number,
    fromEmail: string,
    fromName: string,
    status$: BehaviorSubject<EmailDeliveryStatus>,
  ): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map((supplier) =>
          this.sendEmailToSupplier(
            supplier,
            rfq,
            items,
            template,
            companyInfo,
            pdfBase64,
            pdfSizeKB,
            fromEmail,
            fromName,
          ),
        ),
      );

      // Update status after each batch
      const batchSuccesses = batchResults.filter((r) => r.status === 'fulfilled' && r.value).length;
      const batchFailures = batchResults.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value),
      ).length;

      const currentStatus = status$.value;
      status$.next({
        ...currentStatus,
        sent: currentStatus.sent + batchSuccesses,
        failed: currentStatus.failed + batchFailures,
        pending: currentStatus.pending - batch.length,
      });

      results.push(...batchResults.map((r) => (r.status === 'fulfilled' ? r.value : false)));

      // Small delay between batches to avoid rate limiting
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Send email to a single supplier with delivery tracking
   */
  private sendEmailToSupplier(
    supplier: Supplier,
    rfq: RFQ,
    items: BOQItem[],
    template: any,
    companyInfo: any,
    pdfBase64: string,
    pdfSizeKB: number,
    fromEmail: string,
    fromName: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Prepare template data
        const templateData = {
          '{{companyName}}': companyInfo.companyName || 'FibreFlow',
          '{{supplierName}}': supplier.companyName,
          '{{rfqNumber}}': rfq.rfqNumber,
          '{{projectName}}': rfq.projectName,
          '{{dueDate}}': new Date(rfq.deadline).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          '{{contactPerson}}': fromName,
          '{{contactEmail}}': companyInfo.email || fromEmail,
          '{{contactPhone}}': companyInfo.phone || '',
          '{{itemsTable}}': this.generateItemsTable(items),
          '{{termsAndConditions}}':
            rfq.specialRequirements || 'Standard terms and conditions apply.',
        };

        // Process template
        let emailSubject = template?.subject || `RFQ ${rfq.rfqNumber} - ${rfq.title}`;
        let emailHtml = template?.body || this.generateHTMLEmail(rfq, supplier, items, companyInfo);

        // Replace variables
        Object.entries(templateData).forEach(([key, value]) => {
          emailSubject = emailSubject.replace(new RegExp(key, 'g'), value);
          emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
        });

        // Format HTML
        emailHtml = this.formatEmailAsHTML(emailHtml, companyInfo);
        const emailText = this.htmlToPlainText(emailHtml);

        // Create email document
        const emailDoc: any = {
          to: [supplier.primaryEmail],
          from: fromEmail,
          message: {
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
          },
          // Add metadata for tracking
          metadata: {
            rfqId: rfq.id,
            rfqNumber: rfq.rfqNumber,
            supplierId: supplier.id,
            supplierName: supplier.companyName,
            timestamp: new Date().toISOString(),
          },
        };

        // Add attachment if reasonable size
        if (pdfSizeKB < this.MAX_PDF_SIZE_KB) {
          emailDoc.message.attachments = [
            {
              filename: `RFQ-${rfq.rfqNumber}.pdf`,
              content: pdfBase64,
              encoding: 'base64',
            },
          ];
        } else {
          emailDoc.message.html += `<p><strong>Note:</strong> The RFQ document is available upon request.</p>`;
        }

        console.log(`Sending email to ${supplier.companyName}...`);

        // Send to mail collection
        addDoc(collection(this.firestore, 'mail'), emailDoc)
          .then((docRef) => {
            console.log(`Email queued for ${supplier.companyName}: ${docRef.id}`);

            // Monitor delivery with timeout
            let resolved = false;
            const unsubscribe = onSnapshot(doc(this.firestore, 'mail', docRef.id), (snapshot) => {
              const data = snapshot.data();
              if (data?.['delivery'] && !resolved) {
                if (data['delivery']['state'] === 'SUCCESS') {
                  console.log(`✅ Email delivered to ${supplier.companyName}`);
                  resolved = true;
                  unsubscribe();
                  resolve(true);
                } else if (data['delivery']['state'] === 'ERROR') {
                  console.error(
                    `❌ Email failed for ${supplier.companyName}:`,
                    data['delivery']['error'],
                  );
                  resolved = true;
                  unsubscribe();
                  resolve(false);
                }
              }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
              if (!resolved) {
                console.log(`⏱️ Email timeout for ${supplier.companyName} - assuming sent`);
                resolved = true;
                unsubscribe();
                resolve(true);
              }
            }, 30000);
          })
          .catch((error) => {
            console.error(`Error creating email for ${supplier.companyName}:`, error);
            resolve(false);
          });
      } catch (error) {
        console.error(`Error preparing email for ${supplier.companyName}:`, error);
        resolve(false);
      }
    });
  }

  private generateHTMLEmail(
    rfq: RFQ,
    supplier: Supplier,
    items: BOQItem[],
    companyInfo: any,
  ): string {
    const totalValue = this.calculateTotalValue(items);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RFQ ${rfq.rfqNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0 0 10px 0; font-size: 24px;">Request for Quotation</h1>
      <h2 style="margin: 0; font-size: 20px; font-weight: normal;">${rfq.rfqNumber}</h2>
    </div>
    
    <div style="padding: 30px 20px; background-color: #f8f9fa;">
      <p>Dear <strong>${supplier.companyName}</strong>,</p>
      
      <p>We are pleased to invite you to submit a quotation for the following project:</p>
      
      <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="color: #1976d2; margin-top: 0; margin-bottom: 15px; font-size: 18px;">${rfq.title}</h3>
        <p>${rfq.description}</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Project:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${rfq.projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Total Items:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${items.length} items</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Estimated Value:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>${totalValue}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Submission Deadline:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><span style="background-color: #fff3cd; padding: 2px 4px; border-radius: 3px;">${new Date(rfq.deadline).toLocaleDateString()}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Delivery Location:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${rfq.deliveryLocation || 'To be specified'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Payment Terms:</strong></td>
            <td style="padding: 8px 0;">${this.formatPaymentTerms(rfq.paymentTerms || '')}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #e3f2fd; border-left: 4px solid #1976d2; padding: 15px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">📋 Submission Instructions:</h4>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>Review the attached PDF for the complete list of items and specifications</li>
          <li>Include all applicable taxes and delivery charges in your quote</li>
          <li>Specify the validity period of your quotation</li>
          <li>Provide estimated delivery times for each item</li>
          <li>Submit your quotation before the deadline</li>
        </ol>
      </div>
      
      <p><strong>📎 Please find the detailed RFQ document attached to this email.</strong></p>
      
      <p>To submit your quotation, please reply to this email or send it to: 
         <a href="mailto:${companyInfo.email || 'procurement@fibreflow.com'}">${companyInfo.email || 'procurement@fibreflow.com'}</a></p>
      
      <p>If you have any questions or need clarifications, please don't hesitate to contact us.</p>
      
      <p>We look forward to receiving your competitive quotation.</p>
      
      <p>Best regards,<br>
      <strong>${companyInfo.companyName || 'FibreFlow'} Procurement Team</strong></p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; margin-top: 30px;">
      <p>This is an automated email from FibreFlow Construction Management System</p>
      <p>© 2024 ${companyInfo.companyName || 'FibreFlow'}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private calculateTotalValue(items: BOQItem[]): string {
    const total = items.reduce((sum, item) => {
      return sum + item.unitPrice * item.remainingQuantity;
    }, 0);
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(total);
  }

  private formatPaymentTerms(terms: string): string {
    const termsMap: Record<string, string> = {
      '30_days': '30 Days',
      '60_days': '60 Days',
      '90_days': '90 Days',
      cod: 'Cash on Delivery',
      advance: '50% Advance, 50% on Delivery',
      custom: 'Custom Terms',
    };
    return termsMap[terms] || terms;
  }

  private generateItemsTable(items: BOQItem[]): string {
    let table = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Code</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantity</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unit</th>
        </tr>
      </thead>
      <tbody>`;

    items.forEach((item) => {
      table += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.itemCode}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.remainingQuantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.unit}</td>
        </tr>`;
    });

    table += `</tbody></table>`;
    return table;
  }

  private formatEmailAsHTML(content: string, companyInfo: any): string {
    if (content.includes('<html>') || content.includes('<body>')) {
      return content;
    }
    return content;
  }

  private htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
