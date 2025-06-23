export interface EmailLog {
  id?: string;

  // Email details
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  fromName: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];

  // Metadata
  type: 'rfq' | 'quote' | 'invoice' | 'general' | 'test';
  relatedId?: string; // ID of related document (RFQ, Quote, etc)
  relatedType?: string; // Type of related document
  projectId?: string;
  projectName?: string;

  // Status tracking
  status: 'draft' | 'pending_confirmation' | 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
  confirmationRequired: boolean;
  confirmedBy?: string;
  confirmedAt?: Date;

  // Delivery information
  mailDocumentId?: string; // ID in the mail collection
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  attempts?: number;

  // Audit trail
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;

  // Resend tracking
  originalEmailId?: string; // If this is a resend
  resendCount?: number;
  lastResentAt?: Date;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  encoding: 'base64';
  contentType?: string;
}

export interface EmailTemplate {
  id?: string;
  name: string;
  type: 'rfq' | 'quote' | 'invoice' | 'general';
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[]; // List of variables used in template
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSettings {
  defaultFrom: string;
  defaultFromName: string;
  requireConfirmation: boolean;
  ccFinance?: string;
  ccManagement?: string;
  signatureHtml?: string;
  signatureText?: string;
}
