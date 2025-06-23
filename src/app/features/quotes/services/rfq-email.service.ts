import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import emailjs from '@emailjs/browser';
import { RFQ } from '../models/rfq.model';
import { Supplier } from '../../../core/suppliers/models/supplier.model';
import { BOQItem } from '../../boq/models/boq.model';
import { NotificationService } from '../../../core/services/notification.service';
import { RFQService } from './rfq.service';
import { RFQPDFService } from './rfq-pdf.service';
import { jsPDF } from 'jspdf';

@Injectable({
  providedIn: 'root',
})
export class RFQEmailService {
  private notificationService = inject(NotificationService);
  private rfqService = inject(RFQService);
  private rfqPDFService = inject(RFQPDFService);

  // EmailJS configuration - You'll need to sign up at https://www.emailjs.com/
  // and replace these with your actual IDs
  private readonly SERVICE_ID = 'YOUR_SERVICE_ID'; // e.g., 'service_abc123'
  private readonly TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // e.g., 'template_xyz789'
  private readonly PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // e.g., 'user_ABC123...'

  constructor() {
    // Initialize EmailJS with your public key
    emailjs.init(this.PUBLIC_KEY);
  }

  sendRFQToSuppliers(
    rfq: RFQ,
    suppliers: Supplier[],
    items: BOQItem[],
    pdfDoc?: jsPDF,
  ): Observable<boolean> {
    // Generate PDF if not provided
    if (!pdfDoc) {
      this.rfqPDFService.generateRFQPDF(rfq, items, suppliers);
      // Note: We can't get the PDF back from generateRFQPDF as it downloads directly
      // So we'll need to modify it to return the PDF
    }

    // Send email to each supplier
    const emailPromises = suppliers.map((supplier) => {
      const templateParams = {
        // Supplier details
        to_email: supplier.primaryEmail,
        to_name: supplier.companyName,

        // RFQ details
        rfq_number: rfq.rfqNumber,
        rfq_title: rfq.title,
        project_name: rfq.projectName,
        deadline: new Date(rfq.deadline).toLocaleDateString(),
        delivery_location: rfq.deliveryLocation || 'To be specified',
        payment_terms: this.formatPaymentTerms(rfq.paymentTerms || ''),
        description: rfq.description,
        special_requirements: rfq.specialRequirements || 'None',

        // Summary
        total_items: items.length,
        total_value: this.calculateTotalValue(items),

        // You can attach the PDF by converting it to base64
        // attachment: pdfBase64 // This requires modifying the PDF service
      };

      return emailjs
        .send(this.SERVICE_ID, this.TEMPLATE_ID, templateParams)
        .then((response) => {
          console.log('Email sent successfully:', response);
          return supplier;
        })
        .catch((error) => {
          console.error('Email send failed:', error);
          throw error;
        });
    });

    return from(Promise.allSettled(emailPromises)).pipe(
      switchMap((results) => {
        const successCount = results.filter((r) => r.status === 'fulfilled').length;
        const failCount = results.filter((r) => r.status === 'rejected').length;

        if (successCount > 0) {
          // Update RFQ status to 'sent'
          return this.rfqService
            .updateRFQ(rfq.id!, {
              status: 'sent',
              sentAt: new Date().toISOString(),
            })
            .pipe(
              map(() => {
                if (failCount > 0) {
                  this.notificationService.warn(
                    `RFQ sent to ${successCount} supplier(s). ${failCount} failed.`,
                  );
                } else {
                  this.notificationService.success(
                    `RFQ sent successfully to ${successCount} supplier(s)`,
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
        console.error('Error in email sending process:', error);
        this.notificationService.error('Failed to send emails');
        return of(false);
      }),
    );
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
}

/* 
SETUP INSTRUCTIONS:

1. Sign up at https://www.emailjs.com/ (Free tier: 200 emails/month)

2. Create an email service:
   - Go to Email Services
   - Add New Service
   - Choose Gmail (or your provider)
   - Connect your account
   - Note the Service ID

3. Create an email template:
   - Go to Email Templates
   - Create New Template
   - Use these variables in your template:
     {{to_name}}, {{rfq_number}}, {{rfq_title}}, {{project_name}}, 
     {{deadline}}, {{delivery_location}}, {{payment_terms}}, 
     {{description}}, {{special_requirements}}, {{total_items}}, {{total_value}}

4. Get your public key:
   - Go to Account
   - Copy your Public Key

5. Update this service with your IDs

TEMPLATE EXAMPLE:
Subject: RFQ {{rfq_number}} - {{rfq_title}}

Dear {{to_name}},

We are pleased to invite you to submit a quotation for:

PROJECT: {{project_name}}
RFQ NUMBER: {{rfq_number}}
TITLE: {{rfq_title}}

DETAILS:
- Total Items: {{total_items}}
- Estimated Value: {{total_value}}
- Deadline: {{deadline}}
- Delivery: {{delivery_location}}
- Payment Terms: {{payment_terms}}

DESCRIPTION:
{{description}}

SPECIAL REQUIREMENTS:
{{special_requirements}}

Please submit your quotation before the deadline.

Best regards,
FibreFlow Procurement Team
*/
