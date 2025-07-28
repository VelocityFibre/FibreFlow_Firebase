# Phase 2: Image Processing & Excel Export Plan

## Overview
Add GPS extraction and Excel report generation to the bulk image upload system.

## Current Status
- ✅ Phase 1 Complete: Bulk upload system is live and working
- ✅ Ettiene (ettienejvr@gmail.com) can sign in and upload 278 photos
- ⏸️ Phase 2 On Hold: Wait until bulk upload is complete

## Implementation Plan

### 1. Image Processing Service (COMPLETED - Ready to deploy)
**File**: `src/app/features/images/services/image-processing.service.ts`

**Features**:
- Extract GPS coordinates from image EXIF data
- Reverse geocoding to get addresses
- Process images in batches
- Generate Excel reports with multiple sheets
- Track processing status

**Methods**:
- `getUnprocessedImages(site, project)` - Find images to process
- `processImages(site, project)` - Main processing logic
- `extractGPSFromImage(url, filename)` - GPS extraction
- `reverseGeocode(lat, lng)` - Get address from coordinates
- `generateExcelReport(data)` - Create Excel file
- `downloadExcel(blob, filename)` - Trigger download

### 2. UI Updates (PLANNED)

**Add to bulk-image-upload.component.ts**:

1. **New Imports**:
```typescript
import { ImageProcessingService } from '../../services/image-processing.service';
import { HttpClientModule } from '@angular/common/http';
```

2. **New State Variables**:
```typescript
isProcessing = signal(false);
processingProgress = signal<string>('');
processedCount = signal(0);
totalToProcess = signal(0);
```

3. **Process Button** (in template after upload summary):
```html
<button mat-raised-button color="accent" (click)="processImages()">
  <mat-icon>engineering</mat-icon>
  Process Images & Generate Excel
</button>
```

4. **Processing Method**:
```typescript
async processImages() {
  this.isProcessing.set(true);
  this.processingProgress.set('Starting image processing...');
  
  try {
    const processedData = await this.imageProcessing.processImages(
      this.siteName,
      this.projectName
    );
    
    this.processingProgress.set(`Processed ${processedData.length} images`);
    
    // Generate Excel
    const blob = await this.imageProcessing.generateExcelReport(processedData);
    const filename = `pole-photos-${this.siteName}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download
    this.imageProcessing.downloadExcel(blob, filename);
    
    this.showSuccess('Excel report generated and downloaded!');
  } catch (error) {
    this.showError('Processing failed: ' + error.message);
  } finally {
    this.isProcessing.set(false);
  }
}
```

### 3. Excel Report Structure

**Sheet 1: Pole Photos Data**
| Column | Description |
|--------|-------------|
| File Name | Original image filename |
| Site | Site name (e.g., "Lawley") |
| Project | Project name |
| Upload Date | When uploaded |
| Capture Date | From EXIF if available |
| Latitude | GPS latitude |
| Longitude | GPS longitude |
| GPS Accuracy | Accuracy in meters |
| Address | Reverse geocoded address |
| File Size | In KB |
| Processing Status | completed/failed |
| Error | If processing failed |
| Image URL | Firebase Storage URL |

**Sheet 2: Summary**
- Total Images Processed
- Images with GPS Data
- Images without GPS
- Failed Processing
- Success Rate %
- GPS Extraction Rate %

### 4. Manual Processing for Ettiene

While the UI is on hold, we can process manually:

1. **Query Firestore** for images where:
   - `site` = "Lawley" (or whatever he enters)
   - `processed` = false

2. **For each image**:
   - Download from Firebase Storage
   - Extract EXIF data (use exif-js library)
   - Get GPS coordinates if available
   - Reverse geocode to get address
   - Mark as processed in Firestore

3. **Generate Excel** using the same format
4. **Send report** to Ettiene

### 5. GPS Extraction Notes

**GPS Map Camera Images**: Should have embedded GPS
**WhatsApp Images**: Usually stripped of GPS data
**Regular Photos**: May or may not have GPS

**EXIF Libraries to Consider**:
- `exif-js` - Browser-based EXIF reading
- `piexifjs` - Read/write EXIF
- Server-side: `exiftool` for better extraction

### 6. Deployment Timeline

1. **Now**: Let Ettiene upload all 278 images
2. **After Upload**: Process manually and send report
3. **Next Week**: Deploy Phase 2 UI when safe
4. **Testing**: Use test site first before production

### 7. Security Considerations

- Only process images for authenticated users
- Limit batch sizes to prevent timeouts
- Add rate limiting for processing
- Validate GPS coordinates are reasonable
- Sanitize filenames in Excel export

## Next Steps

1. ✅ Wait for Ettiene to complete upload
2. ⏳ Process his batch manually
3. ⏳ Send Excel report
4. ⏳ Deploy Phase 2 after confirmation
5. ⏳ Add batch processing UI
6. ⏳ Add processing history view

## Manual Processing Commands

```bash
# Check uploaded images count
firebase firestore:get uploaded-images --where "site" "==" "Lawley"

# Export to local JSON for processing
firebase firestore:export uploads-export --collection uploaded-images

# Process with Node script (to be created)
node scripts/process-images-manually.js --site "Lawley"
```

---

**Created**: 2025-01-25
**Status**: Planning Complete, Implementation On Hold
**Priority**: High (after current uploads complete)