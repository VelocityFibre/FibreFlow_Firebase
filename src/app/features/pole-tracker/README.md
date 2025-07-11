# Pole Tracker Feature

## Overview
The Pole Tracker is a comprehensive system for managing fiber optic pole installations with separate desktop and mobile interfaces.

## Recent Updates (2025-01-11)

### New Fields Added
1. **Pole Number** - Physical pole identification number
2. **PON** - Passive Optical Network identifier
3. **Zone** - Geographic/administrative zone
4. **Distribution/Feeder** - Network type specification
5. **GPS Location** - Renamed from "Location" for clarity

### UI Improvements
- Date format shortened to "d MMM ''yy" (e.g., "7 Jul '25") to fit column width
- Desktop and Mobile versions now clearly separated in navigation
- New columns added to list view with responsive table design

## Navigation Structure

### Desktop Routes
- `/pole-tracker` - Main list view with filters and stats
- `/pole-tracker/new` - Create new pole entry
- `/pole-tracker/:id` - View pole details
- `/pole-tracker/:id/edit` - Edit existing pole

### Mobile Routes
- `/pole-tracker/mobile` - Map view for field workers
- `/pole-tracker/mobile/capture` - Quick photo capture
- `/pole-tracker/mobile/capture/:plannedPoleId` - Capture for specific pole
- `/pole-tracker/mobile/assignments` - View assigned poles
- `/pole-tracker/mobile/nearby` - Find nearby poles

## Field Definitions

### Required Fields
- **VF Pole ID** - Auto-generated format: `{ProjectCode}.P.{Number}`
- **GPS Location** - Coordinates or address with GPS capture button

### Optional Fields
- **Pole Number** - Physical pole number
- **PON** - Network segment identifier
- **Zone** - Area designation
- **Distribution/Feeder** - Network type
- **Alternative Pole ID** - Used when pole number not available
- **Group Number** - For grouped poles

## Photo Requirements
Six photo types must be uploaded for each pole:
1. Before - Site before installation
2. Front - Front view of installed pole
3. Side - Side angle view
4. Depth - Showing installation depth
5. Concrete - Concrete base/foundation
6. Compaction - Ground compaction

## Desktop Features
- Advanced filtering by project, contractor, upload status
- Statistics dashboard (total, QA checked, complete uploads, progress %)
- Bulk import from CSV/Excel
- Quality assurance workflow
- Comprehensive list view with all fields

## Mobile Features
- GPS-based map view
- Quick photo capture
- Offline queue for poor connectivity
- Assignment management
- Navigation to pole locations
- Simplified forms for field use

## Technical Details

### Services
- `PoleTrackerService` - Main CRUD operations
- `GoogleMapsService` - Map integration
- `ImageUploadService` - Photo management
- `OfflineQueueService` - Offline support

### Models
- `PoleTracker` - Main pole data model
- `PlannedPole` - Pre-imported pole data
- `PoleInstallation` - Mobile capture model
- `ImportBatch` - Bulk import tracking

### Components Structure
```
pole-tracker/
├── pages/
│   ├── pole-tracker-list/
│   ├── pole-tracker-form/
│   └── pole-tracker-detail/
├── mobile/
│   ├── map-view/
│   ├── quick-capture/
│   ├── my-assignments/
│   └── nearby-poles/
├── components/
│   ├── image-upload/
│   ├── pole-details-dialog/
│   └── photo-viewer-dialog/
└── services/
    ├── pole-tracker.service.ts
    ├── google-maps.service.ts
    └── offline-queue.service.ts
```

## Usage Tips

### For Desktop Users
1. Use filters to narrow down pole lists
2. Check upload progress in the list view
3. Use bulk import for large datasets
4. Monitor quality check status

### For Mobile Users
1. Enable location services for GPS features
2. Use offline mode in poor connectivity areas
3. Follow photo capture guidelines
4. Check assignments regularly

## Related Documentation
- [Field Definitions](../../../docs/POLE_TRACKER_FIELDS.md)
- [Component Library](../../../docs/COMPONENT_LIBRARY.md)
- [Testing Guide](../../../docs/TESTING_GUIDE.md)