# Bulk Image Upload System - Implementation Plan

**Date**: 2025-07-25  
**Status**: APPROVED  
**Phase**: 1 (Upload Function Only)  

## Executive Summary

Create a bulk image upload system for pole photos with GPS metadata. Phase 1 focuses solely on upload functionality with proper Firebase Storage integration and user-controlled labeling.

## Requirements

- **Image Type**: Pole photos with GPS Map Camera overlay (~278 photos)
- **Storage**: Firebase Storage (current Firestore project)
- **Organization**: Well-labeled with user input for site/project naming
- **Volume**: Hundreds of images per upload session
- **Scope**: Phase 1 = Upload only, Phase 2 = Claude scanning & Excel export

## Phase 1: Upload Function Implementation

### Core Components

1. **BulkImageUploadComponent**
   - Location: `src/app/features/images/components/bulk-image-upload/`
   - Drag & drop interface
   - Multi-file selection
   - Progress tracking per image
   - User input for site/project labeling

2. **ImageUploadService**
   - Location: `src/app/core/services/image-upload.service.ts`
   - Firebase Storage integration
   - Resumable uploads
   - Error handling & retry logic
   - Metadata management

3. **Firestore Collections**
   ```
   image-batches/
   ├── {batchId}/
   │   ├── site: string
   │   ├── project: string
   │   ├── uploadDate: Timestamp
   │   ├── userId: string
   │   ├── status: 'uploading' | 'completed' | 'failed'
   │   ├── totalImages: number
   │   └── completedImages: number
   
   uploaded-images/
   ├── {imageId}/
   │   ├── fileName: string
   │   ├── batchId: string
   │   ├── site: string
   │   ├── project: string
   │   ├── firebaseStorageUrl: string
   │   ├── uploadDate: Timestamp
   │   ├── userId: string
   │   ├── status: 'uploading' | 'completed' | 'failed'
   │   └── metadata: { size, type, etc. }
   ```

### User Workflow

1. **Navigate to Upload Section**
   - New menu item: "Image Upload"
   - Route: `/images/upload`

2. **Select Images & Label**
   - Drag & drop or file picker
   - Required fields: Site name, Project (optional)
   - Display image preview thumbnails

3. **Upload with Progress**
   - Individual progress bars per image
   - Overall batch progress
   - Pause/resume capability
   - Error handling with retry

4. **Completion Summary**
   - Total uploaded count
   - Failed uploads (if any)
   - Next steps info for Phase 2

### Technical Implementation

**Storage Structure in Firebase:**
```
/images/
├── pole-photos/
│   ├── {site-name}/
│   │   ├── {project-name}/
│   │   │   ├── batch-{timestamp}/
│   │   │   │   ├── image-001.jpg
│   │   │   │   ├── image-002.jpg
│   │   │   │   └── ...
```

**Key Features:**
- **Resumable uploads** using Firebase Storage SDK
- **Duplicate detection** by filename within batch
- **Automatic retry** for failed uploads (3 attempts)
- **Network interruption recovery**
- **Progress persistence** in Firestore
- **User-friendly error messages**

### Navigation Integration

Add to main navigation:
- **Section**: Data Management (new or existing)
- **Menu Item**: "Image Upload"
- **Icon**: `cloud_upload` or `add_photo_alternate`
- **Route**: `/images/upload`

## Success Criteria

- [ ] User can drag & drop multiple images
- [ ] User can specify site/project names
- [ ] Images upload to Firebase Storage with proper organization
- [ ] Progress tracking works during upload
- [ ] Failed uploads can be retried
- [ ] Upload can resume after network interruption
- [ ] Batch metadata saved to Firestore
- [ ] User gets clear confirmation of completion

## Timeline

**Week 1**: Implementation (3-4 days)
- Day 1: Component scaffolding & UI
- Day 2: Firebase Storage integration
- Day 3: Progress tracking & error handling
- Day 4: Testing & polish

**Phase 2**: TBD (Claude scanning + Excel export)

## Technical Notes

- Use Firebase Storage (not Firestore) for image files
- Store metadata in Firestore for querying
- Implement proper loading states and error boundaries
- Follow existing FibreFlow patterns and theming
- Test with large batches (100+ images)

## Dependencies

- Existing Firebase project (fibreflow-73daf)
- Angular File Upload libraries (if needed)
- Firebase Storage security rules update

## Future Phase 2 Integration

- Collection structure designed for easy Phase 2 integration
- Batch tracking enables processing queue management
- User labeling provides context for Claude analysis
- Storage organization supports systematic processing