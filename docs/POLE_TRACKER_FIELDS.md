# Pole Tracker Field Documentation

*Last Updated: 2025-01-11*

## Overview

The Pole Tracker feature has been enhanced with additional fields to capture comprehensive pole installation data for fiber optic network deployment.

## Field Definitions

### Core Identity Fields

1. **VF Pole ID** (Required, Auto-generated)
   - Format: `{ProjectCode}.P.{SequentialNumber}`
   - Example: `LAW.P.A001`
   - Automatically generated based on selected project

2. **Pole Number** (Optional)
   - Physical pole number as marked on the actual pole
   - Used for field identification
   - Free text field

3. **Alternative Pole ID** (Optional)
   - Used when physical pole number is not available or not found
   - Backup identification method
   - Free text field

4. **Group Number** (Optional)
   - Used when multiple poles are grouped together
   - Helps track pole clusters
   - Free text field

### Network Configuration Fields

5. **PON** (Optional)
   - Passive Optical Network identifier
   - Links pole to specific network segment
   - Example: `PON-01`, `PON-LAW-02`
   - Free text field

6. **Zone** (Optional)
   - Geographic or administrative zone designation
   - Helps with area-based reporting and filtering
   - Example: `Zone A`, `North Zone`, `Z1`
   - Free text field

7. **Distribution/Feeder** (Optional)
   - Specifies if pole is part of distribution or feeder network
   - Common values: `Distribution`, `Feeder`, `D`, `F`
   - Can include specific route identifiers
   - Free text field

### Location Field

8. **GPS Location** (Required)
   - Renamed from "Location" for clarity
   - Accepts GPS coordinates or address
   - Format: `latitude, longitude` or street address
   - GPS capture button available for field workers
   - Example: `-26.2041, 28.0473`

## Data Entry Guidelines

### Desktop Version
- All fields are available in the form under "Basic Information" section
- Fields are organized in a responsive grid layout
- GPS location can be captured using device location

### Mobile Version
- Optimized for field data entry
- Quick capture mode available
- GPS validation against planned locations

## List View Display

The desktop list view displays columns in this order:
1. VF Pole ID (clickable link)
2. Pole # 
3. PON
4. Zone
5. Dist/Feeder
6. GPS (monospace font for coordinates)
7. Project
8. Date Installed
9. Type
10. Contractor
11. Upload Progress
12. QA Status
13. Actions

## Usage Scenarios

### Scenario 1: Standard Installation
- VF Pole ID: Auto-generated
- Pole Number: Enter physical number from pole
- PON: Enter network segment
- Zone: Enter area designation
- GPS: Capture current location

### Scenario 2: Unmarked Pole
- VF Pole ID: Auto-generated
- Pole Number: Leave blank
- Alternative Pole ID: Create unique identifier
- Other fields: Fill as normal

### Scenario 3: Grouped Poles
- Fill standard fields
- Group Number: Enter cluster identifier
- Helps track multiple poles installed together

## Technical Implementation

### Model Changes
Fields added to `PoleTracker` interface:
```typescript
// Pole Identification
poleNumber?: string;
pon?: string;
zone?: string;
distributionFeeder?: string;
```

### Form Validation
- Only VF Pole ID and GPS Location are required
- All network fields are optional
- No specific format validation on optional fields

### Database Storage
- Fields stored in Firestore `poleTrackers` collection
- Existing poles will have `undefined` for new fields
- No migration required

## Future Enhancements

1. **Field Validation**
   - PON format validation
   - Zone dropdown from predefined list
   - Distribution/Feeder as select field

2. **Reporting**
   - Filter by PON, Zone
   - Network topology visualization
   - Zone-based progress tracking

3. **Mobile Enhancements**
   - Offline field caching
   - Bulk PON assignment
   - Zone-based assignments

## Related Documentation

- [Pole Tracker Overview](./COMPONENT_LIBRARY.md)
- [Mobile Features](./TESTING_GUIDE.md)
- [API Reference](./API_REFERENCE.md)