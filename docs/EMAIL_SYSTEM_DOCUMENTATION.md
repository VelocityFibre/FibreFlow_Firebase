# Email System Documentation

## Overview

FibreFlow uses Firebase Email Extension for sending emails. The system has evolved from a complex logging-based approach to a simplified direct-sending approach to improve reliability.

## Architecture

### Components

1. **Firebase Email Extension**
   - Handles actual email delivery via SendGrid
   - Monitors the `mail` collection for new emails
   - Updates delivery status in real-time

2. **Email Services**
   - `EmailLogService` - Original service with logging and confirmation flow
   - `RFQFirebaseEmailSimpleService` - Simplified service for direct sending

3. **Email Types**
   - RFQ (Request for Quotation) emails with PDF attachments
   - Test emails for system verification
   - General notification emails

## Email Flow

### Original Flow (EmailLogService)
1. Create email log entry in `emailLogs` collection
2. Require manual confirmation (optional)
3. Send to `mail` collection
4. Monitor delivery status
5. Update email log with results

### Simplified Flow (RFQFirebaseEmailSimpleService)
1. Send directly to `mail` collection
2. Monitor delivery status in real-time
3. Return success/failure immediately

## Key Files

### Services
- `/src/app/features/emails/services/email-log.service.ts` - Main email service with logging
- `/src/app/features/quotes/services/rfq-firebase-email-simple.service.ts` - Simplified RFQ email service
- `/src/app/features/quotes/services/rfq-firebase-email.service.ts` - Original RFQ email service

### Components
- `/src/app/features/emails/components/email-history/` - Email history viewer
- `/src/app/features/quotes/pages/rfq-detail-page/` - RFQ detail page with send functionality

### Models
- `/src/app/features/emails/models/email.model.ts` - Email data structures

## Common Issues and Solutions

### Issue: "Unsupported field value: undefined"
**Cause**: Firebase doesn't accept undefined values in documents
**Solution**: 
```typescript
// Remove undefined fields before sending
Object.keys(emailDoc).forEach(key => {
  if (emailDoc[key] === undefined) {
    delete emailDoc[key];
  }
});
```

### Issue: Emails stuck in "sending" state
**Cause**: Complex logging flow or large attachments
**Solution**: Use simplified service or reduce attachment size

### Issue: Browser cache showing old code
**Solution**: Hard refresh (Ctrl+Shift+R) or clear browser cache

## Email Document Structure

```typescript
interface EmailDocument {
  to: string[];              // Required: recipient emails
  from: string;              // Required: sender email
  message: {
    subject: string;         // Required: email subject
    text: string;            // Required: plain text version
    html: string;            // Optional: HTML version
    attachments?: [{         // Optional: file attachments
      filename: string;
      content: string;       // Base64 encoded
      encoding: 'base64';
    }];
  };
  cc?: string[];            // Optional: CC recipients
  bcc?: string[];           // Optional: BCC recipients
}
```

## Testing Emails

### Quick Test from Browser Console
```javascript
// Import Firestore
const { getFirestore, collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
const db = getFirestore();

// Send test email
const emailDoc = {
  to: ['test@example.com'],
  from: 'noreply@velocityfibre.com',
  message: {
    subject: 'Test Email',
    text: 'This is a test email',
    html: '<p>This is a test email</p>'
  }
};

const docRef = await addDoc(collection(db, 'mail'), emailDoc);
console.log('Email sent with ID:', docRef.id);
```

## RFQ Email Specifics

### Features
- PDF attachment generation with jsPDF
- Multiple recipient support (suppliers)
- Template-based content
- Delivery status tracking

### PDF Size Considerations
- PDFs are base64 encoded (increases size by ~33%)
- Firebase has document size limits
- Large PDFs may cause delivery issues
- Simplified service includes size checking

## Email Templates

### Location
- Database: `settings/emailSettings` document
- Templates: Stored in `EmailTemplate` collection
- Default templates in code as fallback

### Template Variables
- `{{companyName}}` - Company name
- `{{supplierName}}` - Recipient company
- `{{rfqNumber}}` - RFQ identifier
- `{{projectName}}` - Project name
- `{{dueDate}}` - Submission deadline
- `{{contactPerson}}` - Sender name
- `{{contactEmail}}` - Sender email

## Monitoring and Debugging

### Check Email Status
1. Email History page: `/emails/history`
2. Firebase Console: `mail` collection
3. Browser console logs during sending

### Debug Scripts
- `/scripts/test-email-extension.js` - Test basic email sending
- `/scripts/test-rfq-email-simple.js` - Test RFQ emails
- `/scripts/fix-pending-emails.js` - Clean up stuck emails
- `/scripts/debug-rfq-email.js` - Analyze email issues

## Best Practices

1. **Always handle undefined values**
   - Check for null/undefined before adding to documents
   - Use optional chaining and nullish coalescing

2. **Monitor attachment sizes**
   - Keep PDFs under 10MB
   - Consider linking to documents instead of attaching

3. **Use appropriate service**
   - Simple emails: Direct to `mail` collection
   - Complex workflows: EmailLogService
   - RFQ emails: RFQFirebaseEmailSimpleService

4. **Error handling**
   - Catch and log all errors
   - Provide user-friendly error messages
   - Include fallback options

## Future Improvements

1. **Email queue management**
   - Retry failed emails automatically
   - Batch sending for multiple recipients
   - Rate limiting for large campaigns

2. **Enhanced templates**
   - Rich HTML editor for templates
   - Preview before sending
   - A/B testing support

3. **Analytics**
   - Open rate tracking
   - Click tracking for links
   - Delivery performance metrics

## Environment Configuration

### Firebase Email Extension Settings
- Located in Firebase Console > Extensions
- Uses SendGrid for actual delivery
- Configuration stored in extension settings

### Required Environment Variables
```
FIREBASE_PROJECT_ID=fibreflow-73daf
DEFAULT_FROM_EMAIL=noreply@velocityfibre.com
DEFAULT_FROM_NAME=Velocity Fibre
```

## Troubleshooting Checklist

1. ✓ Check browser console for errors
2. ✓ Verify email document structure
3. ✓ Check for undefined fields
4. ✓ Verify Firebase Email Extension is installed
5. ✓ Check `mail` collection for document
6. ✓ Monitor delivery status updates
7. ✓ Check attachment sizes
8. ✓ Clear browser cache if needed
9. ✓ Verify recipient email addresses
10. ✓ Check SendGrid logs in Firebase Console