# OneMap Integration - Development Notes

## Overview
OneMap integration for payment verification and NAD ID management within FibreFlow.

## Current Status (2025-01-11)

### Completed ✅
- Basic component structure created
- Service layer implemented with TypeScript fixes
- Model definitions for OneMapSettings and OneMapRecord
- SCSS styling with proper theme integration
- Fixed spacing issues (now using ff-spacing() functions)
- Basic UI layout with Material components

### In Progress 🚧
- CRUD operations for NAD ID records
- Form validation for manual entry
- Excel file upload functionality
- Payment verification module integration

### TODO 📋

#### High Priority
- [ ] Complete form validation for manual NAD ID entry
- [ ] Implement Excel upload with parsing
- [ ] Add error handling for duplicate NAD IDs
- [ ] Create payment verification workflow
- [ ] Add success/error notifications

#### Medium Priority
- [ ] Implement search/filter for NAD ID list
- [ ] Add pagination for large datasets
- [ ] Create export functionality
- [ ] Add bulk operations (delete multiple)
- [ ] Implement data validation rules

#### Low Priority
- [ ] Add import history tracking
- [ ] Create detailed audit logs
- [ ] Add keyboard shortcuts
- [ ] Implement undo/redo functionality

## Technical Debt
- Need to fix TypeScript error with `escapeCsvValue` function (undefined parameter)
- Consider moving CSV escape logic to a utility function
- Review service method signatures for consistency

## API Integration Points
- Payment verification endpoint (TBD)
- NAD ID validation service (TBD)
- Bulk import processing (consider Firebase Functions)

## Database Schema
```typescript
// Firestore Collection: oneMapSettings
{
  userId: string;
  settings: {
    defaultPaymentMethod?: string;
    autoVerifyPayments?: boolean;
    notificationEmail?: string;
  };
  records: OneMapRecord[];
  lastUpdated: Date;
  createdAt: Date;
}
```

## Notes
- Using standalone component pattern
- Material Design integration complete
- Theme-aware styling implemented
- Responsive design considerations added

## Dependencies
- @angular/material (various modules)
- Firebase/Firestore
- xlsx library (for Excel parsing - to be added)

## Related Files
- Model: `onemap.model.ts`
- Service: `onemap.service.ts`
- Component: `onemap.component.ts`
- Styles: `onemap.scss`
- Parent Route: `/settings/onemap`