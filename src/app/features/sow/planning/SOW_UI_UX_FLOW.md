# SOW Module - UI/UX Flow Documentation

## Overview
This document outlines the complete user interface and user experience flow for the SOW module, including wireframes, interaction patterns, and responsive design considerations.

## User Journey Map

### 1. Entry Points
```
1. Project Creation Flow
   Projects → New Project → Step 3: SOW Import (Optional)
   
2. Project Detail Page
   Projects → [Project] → Actions → Import SOW Data
   
3. Direct Navigation
   Main Menu → SOW → Import Data
   
4. Quick Action
   Dashboard → Quick Actions → Import SOW
```

## Screen Flows

### 1. SOW Import Wizard (Main Flow)

#### Screen 1: Welcome & File Selection
```
┌─────────────────────────────────────────────────────────┐
│ Import SOW Data                                    [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Import Project Scope Data                           │
│                                                         │
│  Upload your engineering Excel files to automatically   │
│  calculate project scope and daily targets.             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📁 Poles Data                                    │   │
│  │                                                  │   │
│  │  [📎 Drop file here or click to browse]         │   │
│  │                                                  │   │
│  │  Required columns: Pole Number, Status,         │   │
│  │  Latitude, Longitude                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🏠 Drops Data                                    │   │
│  │                                                  │   │
│  │  [📎 Drop file here or click to browse]         │   │
│  │                                                  │   │
│  │  Required: Drop Number, Connected Pole          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔌 Fibre Data                                    │   │
│  │                                                  │   │
│  │  [📎 Drop file here or click to browse]         │   │
│  │                                                  │   │
│  │  Required: Cable Length (meters)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Download Templates]            [Skip] [Next →]        │
└─────────────────────────────────────────────────────────┘
```

#### Screen 2: File Processing & Validation
```
┌─────────────────────────────────────────────────────────┐
│ Processing Files                                   [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ⏳ Processing your files...                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Poles.xlsx                                      │   │
│  │ ████████████████████████████████ 100%          │   │
│  │ ✅ 500 poles found                              │   │
│  │ ⚠️  3 warnings                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Drops.xlsx                                      │   │
│  │ ████████████████████░░░░░░░░░░░ 75%           │   │
│  │ Processing row 600 of 800...                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Fibre.xlsx                                      │   │
│  │ ⏳ Waiting...                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Validation Issues:                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️  3 poles missing GPS coordinates             │   │
│  │ ❌ 2 drops reference non-existent poles         │   │
│  │ ℹ️  PON data missing for 15 poles               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [← Back]                [Fix Issues] [Continue →]      │
└─────────────────────────────────────────────────────────┘
```

#### Screen 3: Validation Results & Corrections
```
┌─────────────────────────────────────────────────────────┐
│ Validation Results                                 [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Validation Summary         [🔄 Re-validate] [Export]   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Overall Status: ⚠️  WARNINGS                     │   │
│  │                                                  │   │
│  │ ✅ 495 Valid Records   ❌ 5 Errors   ⚠️  12 Warnings│
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Critical Issues (Must Fix):                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ❌ Drop References                               │   │
│  │ ┌─────────────────────────────────────────┐     │   │
│  │ │ Drop    │ References │ Action             │     │   │
│  │ ├─────────┼────────────┼────────────────────┤     │   │
│  │ │ DR1234  │ LAW.P.X999 │ [Select Pole ▼]    │     │   │
│  │ │ DR5678  │ LAW.P.Y888 │ [Select Pole ▼]    │     │   │
│  │ └─────────────────────────────────────────┘     │   │
│  │                                                  │   │
│  │ ❌ Pole Capacity Exceeded                        │   │
│  │ ┌─────────────────────────────────────────┐     │   │
│  │ │ Pole      │ Drops │ Max │ Action          │     │   │
│  │ ├───────────┼───────┼─────┼─────────────────┤     │   │
│  │ │ LAW.P.B167│  15   │ 12  │ [Reassign...]   │     │   │
│  │ └─────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Warnings (Review):                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️  Missing Optional Data                         │   │
│  │ • 15 poles without PON assignment               │   │
│  │ • 8 drops without zone information              │   │
│  │ [Auto-fill from nearby] [Ignore]                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [← Back]              [Save Progress] [Continue →]     │
└─────────────────────────────────────────────────────────┘
```

#### Screen 4: Calculations Preview
```
┌─────────────────────────────────────────────────────────┐
│ SOW Calculations                                   [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Project Scope Summary                                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📊 Totals                                        │   │
│  │                                                  │   │
│  │ 🏗️  Pole Permissions:        500                 │   │
│  │ 🏠 Home Sign-ups:           300                 │   │
│  │ 🔌 Fibre Length:            25,000m             │   │
│  │ 📍 Total Drops:             800                 │   │
│  │ 🔧 Spare Capacity:          200                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Daily Targets                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Estimated Project Duration: [50] days           │   │
│  │                                                  │   │
│  │ Based on this duration:                          │   │
│  │ • Poles per day:     10                          │   │
│  │ • Homes per day:     6                           │   │
│  │ • Fibre per day:     500m                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Geographic Breakdown                                   │
│  ┌─────────┬────────────┬────────────┐                │
│  │ Zone    │ Poles      │ Drops      │                │
│  ├─────────┼────────────┼────────────┤                │
│  │ Zone 1  │ 150 (30%)  │ 240 (30%)  │                │
│  │ Zone 2  │ 200 (40%)  │ 320 (40%)  │                │
│  │ Zone 3  │ 150 (30%)  │ 240 (30%)  │                │
│  └─────────┴────────────┴────────────┘                │
│                                                         │
│  [← Back]        [Adjust Duration] [Save to Project →]  │
└─────────────────────────────────────────────────────────┘
```

#### Screen 5: Confirmation & Save
```
┌─────────────────────────────────────────────────────────┐
│ Confirm SOW Import                                 [X] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ Ready to import SOW data                            │
│                                                         │
│  This will:                                             │
│  • Save the imported Excel files to cloud storage      │
│  • Update project KPI targets                          │
│  • Set daily achievement goals                         │
│  • Enable progress tracking against targets            │
│                                                         │
│  Summary:                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Project:     Lawley Phase 2                      │   │
│  │ Total Scope: 500 poles, 300 homes               │   │
│  │ Duration:    50 days                             │   │
│  │ Start Date:  2024-01-15                          │   │
│  │ End Date:    2024-03-15                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️  Note: You can update these targets later from     │
│     the project settings if needed.                     │
│                                                         │
│  [← Back]                    [Cancel] [Import Data →]   │
└─────────────────────────────────────────────────────────┘
```

### 2. Error Recovery Flows

#### Partial Import Success
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Partial Import Complete                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Import Results:                                        │
│  ✅ 498 of 500 poles imported successfully             │
│  ✅ 295 of 300 drops imported successfully             │
│  ✅ All fibre data imported                            │
│                                                         │
│  Failed Records:                                        │
│  [Download Error Report]                                │
│                                                         │
│  What would you like to do?                            │
│  ○ Continue with partial data                          │
│  ○ Fix errors and re-import failed records             │
│  ○ Start over with corrected files                     │
│                                                         │
│  [← Back]                          [Continue →]         │
└─────────────────────────────────────────────────────────┘
```

### 3. Mobile Responsive Design

#### Mobile View (Import Screen)
```
┌─────────────────────┐
│ ≡  Import SOW   ⚙️  │
├─────────────────────┤
│                     │
│ Upload Files        │
│                     │
│ ┌─────────────────┐ │
│ │ 📁 Poles        │ │
│ │ [Tap to upload] │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ 🏠 Drops        │ │
│ │ ✅ Uploaded      │ │
│ │ 800 records     │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ 🔌 Fibre        │ │
│ │ [Tap to upload] │ │
│ └─────────────────┘ │
│                     │
│ [Templates] [Next]  │
└─────────────────────┘
```

## Component Specifications

### 1. File Upload Component
```typescript
interface FileUploadComponent {
  // Visual states
  states: {
    empty: 'Dashed border, upload icon',
    uploading: 'Progress bar, cancel button',
    success: 'Green check, file info',
    error: 'Red border, error message'
  };
  
  // Interactions
  interactions: {
    dragOver: 'Highlight drop zone',
    click: 'Open file browser',
    delete: 'Remove file with confirmation'
  };
  
  // Features
  features: {
    dragDrop: true,
    multipleFiles: false,
    maxSize: '50MB',
    acceptedTypes: ['.xlsx', '.xls'],
    preview: 'Show first 5 rows'
  };
}
```

### 2. Validation Results Table
```typescript
interface ValidationTable {
  // Features
  features: {
    sorting: true,
    filtering: true,
    bulkActions: true,
    inlineEdit: true,
    export: ['PDF', 'Excel']
  };
  
  // Row actions
  rowActions: {
    fix: 'Open correction dialog',
    ignore: 'Mark as reviewed',
    autoFix: 'Apply suggested fix'
  };
  
  // Visualization
  visualization: {
    errorSeverity: 'Color coded (red/yellow/blue)',
    progress: 'Progress bar for batch operations',
    grouping: 'Group by error type'
  };
}
```

### 3. Progress Stepper
```typescript
interface ProgressStepper {
  steps: [
    { label: 'Upload Files', icon: 'upload' },
    { label: 'Validation', icon: 'check_circle' },
    { label: 'Review Calculations', icon: 'calculate' },
    { label: 'Confirm Import', icon: 'done' }
  ];
  
  features: {
    clickableSteps: true,
    saveProgress: true,
    skipOptional: true
  };
}
```

## Interaction Patterns

### 1. Drag and Drop
- Visual feedback on drag over
- File type validation before upload
- Show preview during drag
- Multi-file drop with order indication

### 2. Real-time Validation
- Validate as soon as file is parsed
- Show inline errors immediately
- Progressive disclosure of error details
- Quick fix suggestions inline

### 3. Auto-save & Recovery
- Save progress every 30 seconds
- Recover from browser crash
- Resume interrupted imports
- Undo/redo for corrections

### 4. Loading States
```typescript
// Skeleton screens for each component
const loadingStates = {
  fileUpload: 'Pulsing rectangle',
  dataTable: 'Shimmer rows',
  calculations: 'Animated numbers',
  charts: 'Growing bars'
};
```

## Accessibility Features

### 1. Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys in tables
- Escape to close dialogs

### 2. Screen Reader Support
- Descriptive labels for all actions
- Progress announcements
- Error summaries
- Success confirmations

### 3. Color & Contrast
- WCAG AA compliance
- Error states not just color
- High contrast mode support
- Focus indicators

## Theme Integration

### Light Theme
```scss
.sow-import {
  background: var(--ff-background);
  color: var(--ff-foreground);
  
  .upload-zone {
    border: 2px dashed var(--ff-border);
    &:hover {
      background: var(--ff-secondary);
    }
  }
}
```

### Dark Theme
```scss
[data-theme="dark"] {
  .sow-import {
    .upload-zone {
      border-color: var(--ff-border);
      background: var(--ff-card);
    }
  }
}
```

## Performance Considerations

### 1. Large File Handling
- Stream parsing for files > 10MB
- Virtual scrolling for large tables
- Pagination for validation results
- Background processing with Web Workers

### 2. Responsive Images
- Lazy load icons and images
- SVG icons for scalability
- Optimized file type icons
- Progressive image loading

## User Feedback Mechanisms

### 1. Progress Indicators
- Overall import progress
- Per-file progress bars
- Step completion checkmarks
- Time remaining estimates

### 2. Success States
- Confetti animation on completion
- Success summary with stats
- Next steps guidance
- Share results option

### 3. Error Communication
- Clear error messages
- Actionable solutions
- Help documentation links
- Contact support option

## Integration with Project Flow

### From Project Creation
```
Project Form → Step 3 (Optional) → SOW Import → Auto-populate KPIs
```

### From Project Detail
```
Project Detail → Actions Menu → Import SOW → Update Targets
```

### Impact on Other Modules
```
SOW Import → Updates →
  - Project KPI targets
  - Daily Progress validation
  - Reports baseline
  - Analytics dashboards
```