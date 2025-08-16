# SOW Module - Claude Development Notes

## Context and History

### Initial Request
User requested implementation of SOW (Scope of Work) module based on 8 comprehensive planning documents from a previous session. The module needed to handle Excel imports of infrastructure data (poles, drops, fiber segments).

### Key Challenges Encountered

1. **Excel Parsing Issues**
   - Initial parser expected different file formats
   - User's actual files: Lawley Poles.xlsx, Lawley Drops.xlsx, Fibre.xlsx
   - Fixed by updating sheet detection logic and field mappings

2. **UI Flickering**
   - SOW wizard flickered when opened as dialog
   - Root cause: Change detection issues with dialogs
   - Solution: Converted to standalone page with OnPush strategy

3. **Signal Binding Errors**
   - Multiple runtime errors with Angular signals
   - Fixed by passing signals directly instead of signal values
   - Example: `[projectData]="selectedProject"` instead of `[projectData]="selectedProject()"`

4. **Missing Pole Data**
   - 0 poles imported but 23,708 drops found
   - Drops referenced poles that didn't exist
   - Implemented pole extraction from drop references

## Architectural Decisions

### Database Strategy Discussion
User asked about Firebase vs Neon, leading to extensive analysis:

1. **Initial Question**: "is this data then saved to our firebase or neon dbase?"
2. **Clarification**: SOW is one-time setup data, status updates come from OneMap
3. **Decision**: Use Neon as primary store, display in Firebase app

### Key Insights from User
- "its just the scope of works. there from on its the pole updates that happens in neon"
- "1MapData -> excel -> onemap daily, that needs to be viewed in firebase"
- "these status updates are updated from 1MapData -> excel -> neon"

### Final Architecture
```
SOW Data: Excel → Import Wizard → Neon (one-time)
Updates: 1MapData → Excel → OneMap → Neon (daily)
Display: Firebase App → Query Service → Neon
```

## Import Process Evolution

### Original Design
Multi-file import processing all files together

### Issues Discovered
- Hard to debug which file had problems
- Validation errors weren't specific enough
- Risk of partial imports

### New Design (User Requested)
Single-file sequential import with:
1. Clear instructions per file
2. Validation after each file
3. Confirmation before proceeding
4. Final review before Neon write
5. Protection against duplicates

## Pivotal Simplification (Latest Decision)

### User's Realization
"but also the SOW import process is not critical atm. the 1st priority is to be able to display the scope of work info"

### New Approach
1. **Script-based Import** - Simple Node.js scripts for manual import
2. **Display Focus** - Just show the data in the app
3. **Future Automation** - Import wizard can wait

### Implementation
- Created `scripts/sow-import/import-sow-to-neon.js`
- Added SOW tab to project detail page
- Simple display component queries Neon directly
- No complex wizards or validation UI

## Technical Lessons Learned

### Excel Parsing
- Don't assume file structures
- Log extensively during development
- Handle multiple column name variations
- Extract data from unexpected places

### Angular Signals
- Pass signals to child components, not values
- Use computed() for derived state
- Be careful with change detection

### Dialog vs Page
- Dialogs can cause flickering with complex content
- Standalone pages more stable for wizards
- OnPush strategy helps performance

### Data Architecture
- Mixed data sources are fine (Neon + Firebase)
- Direct queries simpler than sync
- Consider data update patterns early

## Code Patterns Established

### Service Pattern for Neon
```typescript
// Query from Neon
getSOWData(projectId: string) {
  return this.neonService.query(
    'SELECT * FROM sow_poles WHERE project_id = $1',
    [projectId]
  );
}

// Update Neon directly
updatePoleStatus(poleId: string, status: string) {
  return this.neonService.execute(
    'UPDATE sow_poles SET status = $2 WHERE id = $1',
    [poleId, status]
  );
}
```

### Component Pattern for Mixed Data
```typescript
// Load from multiple sources
ngOnInit() {
  // Project info from Firebase
  this.project$ = this.projectService.getProject(this.projectId);
  
  // SOW data from Neon
  this.sowData$ = this.sowService.getSOWData(this.projectId);
}
```

## Current Implementation

### Simple Display Approach
1. **Import Script**: `scripts/sow-import/import-sow-to-neon.js`
   - Manual command-line import
   - Creates Neon tables if needed
   - Handles all three file types

2. **Display Component**: `app-project-sow`
   - Added as tab in project detail page
   - Direct Neon queries
   - Simple tables for poles, drops, fibre
   - Summary cards at top

3. **No Complex UI**
   - No import wizard
   - No validation screens
   - No progress tracking
   - Just display what's in Neon

## Future Considerations

### Import Improvements
- Auto-detect file types better
- Preview data before import
- Bulk edit capabilities
- Import history/versioning

### Neon Integration
- Connection pooling
- Query optimization
- Caching strategy
- Error recovery

### User Experience
- Progress indicators for large imports
- Better error messages
- Undo/redo capability
- Import templates

## Summary

The SOW module evolved from a complex multi-file importer to a simple display component with manual import scripts. This simplification came from understanding that:
1. SOW is one-time setup data
2. Display is more important than import UI
3. Scripts are fine for occasional imports
4. Neon is the right place for this data

The final implementation is much simpler and focused on the actual user need: seeing the SOW data in the project context.