# FibreFlow Development Notes Index

## Purpose
This index tracks all page-specific development notes throughout the codebase. Each feature/page should have its own DEV_NOTES.md file documenting current status, TODOs, and technical details.

## Active Development Notes

### Features
- **OneMap Integration**: [`/src/app/features/settings/components/onemap/ONEMAP_DEV_NOTES.md`](../src/app/features/settings/components/onemap/ONEMAP_DEV_NOTES.md)
  - Status: In Progress
  - Priority: High
  - Last Updated: 2025-01-11

- **Meetings**: [`/src/app/features/meetings/MEETINGS_DEV_NOTES.md`](../src/app/features/meetings/MEETINGS_DEV_NOTES.md)
  - Status: Mostly Complete
  - Priority: Medium
  - Last Updated: 2025-01-11

### Shared Components
- **Dev Panel**: [`/src/app/shared/components/dev-panel/DEV_PANEL_NOTES.md`](../src/app/shared/components/dev-panel/DEV_PANEL_NOTES.md)
  - Status: Complete (v1)
  - Priority: Low
  - Last Updated: 2025-01-11

## Naming Convention
- Feature-level notes: `FEATURE_DEV_NOTES.md` in the feature's main directory
- Component-level notes: `COMPONENT_NOTES.md` in the component directory
- Page-specific notes: `PAGE_NOTES.md` in the page component directory

## Template Structure
Each dev notes file should include:
1. Overview
2. Current Status (with date)
3. Completed items ✅
4. In Progress items 🚧
5. TODO items 📋 (prioritized)
6. Technical details/architecture
7. Known issues
8. Related files

## How to Use
1. Create a dev notes file when starting a new feature
2. Update status daily when working on the feature
3. Move items between sections as progress is made
4. Add technical decisions and rationale
5. Document any blockers or dependencies

## Review Schedule
- Weekly: Review all "In Progress" items
- Monthly: Archive completed feature notes
- Quarterly: Clean up and reorganize

## Recently Completed
- Dev Panel implementation (2025-01-11)
- Meetings integration (2025-01-11)

## Upcoming Features
- Invoice Management
- Email Templates
- Advanced Reports
- Mobile App