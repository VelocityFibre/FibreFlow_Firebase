# Plans Directory Structure

This directory stores plans created by the PLANIR workflow system.

## Directory Structure

- **`drafts/`** - Work-in-progress plans that haven't been approved yet
- **`approved/`** - User-approved plans ready for implementation  
- **`completed/`** - Archived plans for features that have been implemented

## File Naming Convention

Use the format: `FEATURE_PLAN_APPROVED_YYYY-MM-DD.md`

Examples:
- `POLE_ANALYTICS_PLAN_APPROVED_2025-07-24.md`
- `REPORTING_SYSTEM_PLAN_APPROVED_2025-07-24.md`
- `USER_AUTHENTICATION_PLAN_APPROVED_2025-07-24.md`

## How Plans Are Created

Plans are automatically created when using:
- `/new_plan` command - For comprehensive feature planning
- `/new_task` command - For simpler task planning (may skip plan files for very simple tasks)

## Plan Lifecycle

1. **Draft** - Created during planning phase, may be modified
2. **Approved** - User has confirmed the plan, ready for implementation
3. **Completed** - Implementation finished, plan archived for reference

## Plan Template

Each plan should include:
- Executive summary
- Requirements and constraints
- Technical approach
- Implementation phases
- Success criteria
- Timeline and milestones
- Risk assessment