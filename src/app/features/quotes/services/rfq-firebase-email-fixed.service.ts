import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap, take } from 'rxjs/operators';
import { RFQ } from '../models/rfq.model';
import { Supplier } from '../../../core/suppliers/models/supplier.model';
import { BOQItem } from '../../boq/models/boq.model';
import { NotificationService } from '../../../core/services/notification.service';
import { RFQService } from './rfq.service';
import { RFQPDFService } from './rfq-pdf.service';
import { EmailLogService } from '../../emails/services/email-log.service';
import { EmailLog } from '../../emails/models/email.model';
import { AuthService } from '../../../core/services/auth.service';
import { EmailTemplateService } from '../../settings/services/email-template.service';
import { CompanyService } from '../../settings/services/company.service';
import { EmailTemplateType } from '../../settings/models/email-template.model';

@Injectable({
  providedIn: 'root',
})
export class RFQFirebaseEmailFixedService {
  private firestore = inject(Firestore);
  private notificationService = inject(NotificationService);
  private rfqService = inject(RFQService);
  private rfqPDFService = inject(RFQPDFService);
  private emailLogService = inject(EmailLogService);
  private authService = inject(AuthService);
  private emailTemplateService = inject(EmailTemplateService);
  private companyService = inject(CompanyService);

  sendRFQToSuppliers(
    rfq: RFQ,
    suppliers: Supplier[],
    items: BOQItem[],
    requireConfirmation = false,
  ): Observable<boolean> {
    // First get the email template and company info
    return forkJoin([
      this.emailTemplateService.getTemplateByType(EmailTemplateType.RFQ).pipe(take(1)),
      this.companyService.getCompanyInfo().pipe(take(1)),
    ]).pipe(
      switchMap(([template, companyInfo]) => {
        // Generate PDF
        const pdfDoc = this.rfqPDFService.generateRFQPDF(rfq, items, suppliers);
        const pdfBase64 = this.rfqPDFService.getPDFAsBase64(pdfDoc);

        // Check PDF size
        const pdfSizeKB = (pdfBase64.length * 0.75) / 1024; // Approximate size in KB
        console.log(`RFQ PDF size: ${pdfSizeKB.toFixed(2)}KB`);

        if (pdfSizeKB > 5000) {
          // 5MB limit
          console.warn('PDF size exceeds 5MB, may cause delivery issues');
          this.notificationService.warning('Large PDF generated. This may affect email delivery.');
        }

        const currentUser = this.authService.getCurrentUser();

        // Use simpler from fields
        const fromEmail = currentUser?.email || companyInfo.email || 'noreply@velocityfibre.com';
        const fromName =
          currentUser?.displayName || companyInfo.companyName || 'FibreFlow Procurement';

        // Create email log entries for each supplier
        const emailLogPromises = suppliers.map((supplier) => {
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
            '{{contactPerson}}':
              currentUser?.displayName || companyInfo.companyName || 'Procurement Team',
            '{{contactEmail}}': fromEmail,
            '{{contactPhone}}': companyInfo.phone || '',
            '{{itemsTable}}': this.generateItemsTable(items),
            '{{termsAndConditions}}':
              rfq.specialRequirements || 'Standard terms and conditions apply.',
          };

          // Process template or use defaults
          let emailSubject = template?.subject || `RFQ ${rfq.rfqNumber} - ${rfq.title}`;
          let emailHtml = template?.body || this.generateHTMLEmail(rfq, supplier, items);

          // Replace variables in template
          Object.entries(templateData).forEach(([key, value]) => {
            emailSubject = emailSubject.replace(new RegExp(key, 'g'), value);
            emailHtml = emailHtml.replace(new RegExp(key, 'g'), value);
          });

          // Convert to HTML format if template is plain text
          emailHtml = this.formatEmailAsHTML(emailHtml, companyInfo);
          const emailText = this.htmlToPlainText(emailHtml);

          const emailLog: EmailLog = {
            to: [supplier.primaryEmail],
            from: fromEmail, // Simple email without name formatting
            fromName: fromName,
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
            status: requireConfirmation ? 'pending_confirmation' : 'draft',
            confirmationRequired: requireConfirmation,
            attachments: [
              {
                filename: `${rfq.rfqNumber}.pdf`,
                content: pdfBase64,
                encoding: 'base64',
              },
            ],
            type: 'rfq' as const,
            relatedId: rfq.id,
            relatedType: 'rfq',
            projectId: rfq.projectId,
            projectName: rfq.projectName,
            createdBy: currentUser?.uid || 'system',
            createdByName: currentUser?.displayName || 'System',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return this.emailLogService.createEmailLog(emailLog);
        });

        // Create all email logs first
        return from(Promise.all(emailLogPromises)).pipe(
          switchMap((emailLogIds) => {
            if (requireConfirmation) {
              // If confirmation required, don't send immediately
              this.notificationService.info(
                `${suppliers.length} email(s) prepared for review. Please confirm before sending.`,
              );
              return of(true);
            } else {
              // Send emails with improved error handling
              const sendPromises = emailLogIds.map(async (logId) => {
                try {
                  const emailLog = await this.emailLogService
                    .getEmailLog(logId)
                    .pipe(take(1))
                    .toPromise();
                  if (emailLog) {
                    console.log('Sending email for log ID:', logId);

                    // Send directly to mail collection with simplified structure
                    const emailDoc = {
                      to: emailLog.to,
                      from: emailLog.from, // Simple email address
                      message: {
                        subject: emailLog.subject,
                        text: emailLog.text,
                        html: emailLog.html,
                        attachments: emailLog.attachments,
                      },
                    };

                    // Add custom from header if needed
                    if (emailLog.fromName) {
                      (emailDoc.message as any).headers = {
                        From: `${emailLog.fromName} <${emailLog.from}>`,
                      };
                    }

                    const mailDocRef = await addDoc(collection(this.firestore, 'mail'), emailDoc);

                    // Update email log with mail document ID
                    await this.emailLogService.updateEmailStatus(logId, {
                      status: 'sending',
                      mailDocumentId: mailDocRef.id,
                      sentAt: new Date(),
                    });

                    return mailDocRef.id;
                  }
                  throw new Error('Email log not found for ID: ' + logId);
                } catch (error) {
                  console.error(`Error sending email for log ${logId}:`, error);
                  await this.emailLogService.updateEmailStatus(logId, {
                    status: 'failed',
                    failedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                  });
                  throw error;
                }
              });

              return from(Promise.allSettled(sendPromises)).pipe(
                switchMap((results) => {
                  const successful = results.filter((r) => r.status === 'fulfilled').length;
                  const failed = results.filter((r) => r.status === 'rejected').length;

                  console.log(`Email send results: ${successful} successful, ${failed} failed`);

                  if (successful > 0) {
                    // Update RFQ status to 'sent' if at least one email was sent
                    return this.rfqService
                      .updateRFQ(rfq.id!, {
                        status: 'sent',
                        sentAt: new Date(),
                      } as Partial<RFQ>)
                      .pipe(
                        map(() => {
                          if (failed > 0) {
                            this.notificationService.warning(
                              `RFQ sent to ${successful} supplier(s), but ${failed} failed. Check email history.`,
                            );
                          } else {
                            this.notificationService.success(
                              `RFQ queued for delivery to ${successful} supplier(s). Check email history for delivery status.`,
                            );
                          }
                          return true;
                        }),
                      );
                  } else {
                    this.notificationService.error('Failed to send RFQ to any suppliers');
                    return of(false);
                  }
                }),
                catchError((error) => {
                  console.error('Error processing emails:', error);
                  this.notificationService.error('Failed to process RFQ emails');
                  return of(false);
                }),
              );
            }
          }),
          catchError((error) => {
            console.error('Error processing RFQ emails:', error);
            this.notificationService.error('Failed to process RFQ emails');
            return of(false);
          }),
        );
      }),
    );
  }

  private generatePlainTextEmail(rfq: RFQ, supplier: Supplier, items: BOQItem[]): string {
    const totalValue = this.calculateTotalValue(items);

    return `Dear ${supplier.companyName},

We are pleased to invite you to submit a quotation for the following project:

RFQ NUMBER: ${rfq.rfqNumber}
PROJECT: ${rfq.projectName}
TITLE: ${rfq.title}

DESCRIPTION:
${rfq.description}

PROJECT DETAILS:
- Total Items: ${items.length}
- Estimated Total Value: ${totalValue}
- Deadline for Submission: ${new Date(rfq.deadline).toLocaleDateString()}
- Delivery Location: ${rfq.deliveryLocation || 'To be specified'}
- Payment Terms: ${this.formatPaymentTerms(rfq.paymentTerms || '')}
${rfq.specialRequirements ? `- Special Requirements: ${rfq.specialRequirements}` : ''}

INSTRUCTIONS FOR QUOTATION:
1. Please review the attached PDF for the complete list of items and specifications
2. Include all applicable taxes and delivery charges in your quote
3. Specify the validity period of your quotation
4. Provide detailed specifications for each item
5. Include estimated delivery times for each item
6. Submit your quotation before the deadline

Please submit your quotation by replying to this email or sending it to: procurement@fibreflow.com

For any clarifications, please contact us at the above email address.

Thank you for your interest in this project.

Best regards,
FibreFlow Procurement Team

--
This is an automated email from FibreFlow Construction Management System
© 2024 FibreFlow. All rights reserved.`;
  }

  private generateHTMLEmail(rfq: RFQ, supplier: Supplier, items: BOQItem[]): string {
    const totalValue = this.calculateTotalValue(items);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RFQ ${rfq.rfqNumber}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px;
    }
    .header { 
      background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%);
      color: white; 
      padding: 30px 20px; 
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: normal;
    }
    .content { 
      padding: 30px 20px; 
      background-color: #f8f9fa;
    }
    .details-card { 
      background-color: white; 
      padding: 20px; 
      margin: 20px 0; 
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .details-card h3 {
      color: #1976d2;
      margin-top: 0;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #555;
      min-width: 140px;
    }
    .detail-value {
      flex: 1;
      color: #333;
    }
    .instructions {
      background-color: #e3f2fd;
      border-left: 4px solid #1976d2;
      padding: 15px;
      margin: 20px 0;
    }
    .instructions h4 {
      margin: 0 0 10px 0;
      color: #1976d2;
    }
    .instructions ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 5px 0;
    }
    .button { 
      background-color: #1976d2; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 4px; 
      display: inline-block; 
      margin: 20px 0;
      font-weight: 500;
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      color: #666; 
      font-size: 12px;
      border-top: 1px solid #eee;
      margin-top: 30px;
    }
    .highlight {
      background-color: #fff3cd;
      padding: 2px 4px;
      border-radius: 3px;
    }
    @media only screen and (max-width: 600px) {
      .container { padding: 10px; }
      .header { padding: 20px 15px; }
      .content { padding: 20px 10px; }
      .detail-row { flex-direction: column; }
      .detail-label { min-width: auto; margin-bottom: 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Request for Quotation</h1>
      <h2>${rfq.rfqNumber}</h2>
    </div>
    
    <div class="content">
      <p>Dear <strong>${supplier.companyName}</strong>,</p>
      
      <p>We are pleased to invite you to submit a quotation for the following project:</p>
      
      <div class="details-card">
        <h3>${rfq.title}</h3>
        <p>${rfq.description}</p>
        
        <div class="detail-row">
          <span class="detail-label">Project:</span>
          <span class="detail-value">${rfq.projectName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Items:</span>
          <span class="detail-value">${items.length} items</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Estimated Value:</span>
          <span class="detail-value"><strong>${totalValue}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Submission Deadline:</span>
          <span class="detail-value"><span class="highlight">${new Date(rfq.deadline).toLocaleDateString()}</span></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Delivery Location:</span>
          <span class="detail-value">${rfq.deliveryLocation || 'To be specified'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Terms:</span>
          <span class="detail-value">${this.formatPaymentTerms(rfq.paymentTerms || '')}</span>
        </div>
        ${
          rfq.specialRequirements
            ? `
        <div class="detail-row">
          <span class="detail-label">Special Requirements:</span>
          <span class="detail-value">${rfq.specialRequirements}</span>
        </div>
        `
            : ''
        }
      </div>
      
      <div class="instructions">
        <h4>📋 Submission Instructions:</h4>
        <ol>
          <li>Review the attached PDF for the complete list of items and specifications</li>
          <li>Include all applicable taxes and delivery charges in your quote</li>
          <li>Specify the validity period of your quotation</li>
          <li>Provide estimated delivery times for each item</li>
          <li>Submit your quotation before the deadline</li>
        </ol>
      </div>
      
      <p><strong>📎 Please find the detailed RFQ document attached to this email.</strong></p>
      
      <p>To submit your quotation, please reply to this email or send it to: 
         <a href="mailto:procurement@fibreflow.com">procurement@fibreflow.com</a></p>
      
      <p>If you have any questions or need clarifications, please don't hesitate to contact us.</p>
      
      <p>We look forward to receiving your competitive quotation.</p>
      
      <p>Best regards,<br>
      <strong>FibreFlow Procurement Team</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated email from FibreFlow Construction Management System</p>
      <p>© 2024 FibreFlow. All rights reserved.</p>
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
    // If content already contains HTML tags, return as is
    if (content.includes('<html>') || content.includes('<body>')) {
      return content;
    }

    // Convert markdown-style formatting to HTML
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>\n')
      .replace(/^- (.+)$/gm, '<li>$1</li>');

    // Wrap lists
    html = html.replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>');

    // Create full HTML document
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    strong { color: #1976d2; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
    table { margin: 20px 0; }
    .header {
      text-align: center;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>${companyInfo.companyName || 'FibreFlow'}</h2>
  </div>
  ${html}
  <div class="footer">
    <p>${companyInfo.companyName || 'FibreFlow'}<br>
    ${companyInfo.physicalAddress ? `${companyInfo.physicalAddress.street}, ${companyInfo.physicalAddress.city}` : ''}<br>
    ${companyInfo.email || ''} | ${companyInfo.phone || ''}</p>
  </div>
</body>
</html>`;
  }

  private htmlToPlainText(html: string): string {
    // Remove HTML tags and convert to plain text
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
