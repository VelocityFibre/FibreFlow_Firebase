export interface EmailTemplate {
  id?: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export enum EmailTemplateType {
  RFQ = 'rfq',
  QUOTE_RESPONSE = 'quote_response',
  PURCHASE_ORDER = 'purchase_order',
  GENERAL = 'general'
}

export interface TemplateVariable {
  key: string;
  description: string;
  example: string;
}

export const RFQ_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: '{{companyName}}', description: 'Your company name', example: 'Velocity Fibre' },
  { key: '{{supplierName}}', description: 'Supplier company name', example: 'ABC Suppliers Ltd' },
  { key: '{{rfqNumber}}', description: 'RFQ reference number', example: 'RFQ-2024-001' },
  { key: '{{projectName}}', description: 'Project name', example: 'Ivory Park Development' },
  { key: '{{dueDate}}', description: 'Quote submission due date', example: '15 January 2024' },
  { key: '{{contactPerson}}', description: 'Your contact person name', example: 'John Doe' },
  { key: '{{contactEmail}}', description: 'Your contact email', example: 'john@velocityfibre.com' },
  { key: '{{contactPhone}}', description: 'Your contact phone', example: '+27 11 123 4567' },
  { key: '{{itemsTable}}', description: 'Table of requested items', example: '(Auto-generated table)' },
  { key: '{{termsAndConditions}}', description: 'Terms and conditions', example: '(Your terms)' }
];

export const DEFAULT_RFQ_TEMPLATE: Partial<EmailTemplate> = {
  type: EmailTemplateType.RFQ,
  name: 'Default RFQ Template',
  subject: 'Request for Quotation - {{rfqNumber}} - {{projectName}}',
  body: `Dear {{supplierName}},

We hope this email finds you well.

{{companyName}} would like to request a quotation for the following items required for our {{projectName}} project.

**RFQ Details:**
- RFQ Number: {{rfqNumber}}
- Project: {{projectName}}
- Due Date: {{dueDate}}

**Requested Items:**
{{itemsTable}}

**Submission Instructions:**
Please submit your quotation by {{dueDate}} via email to {{contactEmail}}.

Your quotation should include:
- Unit prices for all items
- Total price including VAT
- Delivery timeframes
- Payment terms
- Validity period of the quote

**Contact Information:**
For any queries regarding this RFQ, please contact:
- Name: {{contactPerson}}
- Email: {{contactEmail}}
- Phone: {{contactPhone}}

{{termsAndConditions}}

We look forward to receiving your competitive quotation.

Best regards,
{{contactPerson}}
{{companyName}}`,
  variables: RFQ_TEMPLATE_VARIABLES,
  isActive: true
};