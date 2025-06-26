# Gemini CLI Quick Start Guide for FibreFlow

## Installation & First Run

```bash
# Quick test (no installation needed)
npx https://github.com/google-gemini/gemini-cli

# For regular use
npm install -g @google/gemini-cli
gemini
```

## Initial Setup

1. **Choose color theme** (press Enter for default)
2. **Select authentication**: Choose "Login with Google" for free tier
3. **Allow file operations**: Select "Always allow" for smoother workflow

## Essential Commands

### Basic Usage
```bash
# Start Gemini CLI in your project
cd /home/ldp/VF/Apps/FibreFlow
gemini

# Exit
/exit or Ctrl+C
```

### Built-in Commands
- `/help` - Show available commands
- `/save memory <fact>` - Save project context
- `/list tools` - Show available tools
- `/theme` - Change color theme

## FibreFlow-Specific Examples

### 1. Generate Angular Components

```bash
# Contractor payment tracking component
"Create an Angular component for tracking contractor payments with:
- List of pending/completed payments
- Payment approval workflow
- Integration with our existing contractor service
- Material Design table with sorting/filtering
Use our standard component structure in src/app/features/contractors/components/"

# Dashboard widget
"Create a dashboard widget component showing daily fiber installation progress:
- Real-time data from Firestore
- Chart using our existing chart.js setup
- Responsive design matching our dashboard grid"
```

### 2. Firebase Integration Tasks

```bash
# Optimize Firestore queries
"Analyze src/app/features/contractors/services/contractor.service.ts and optimize the Firestore queries for better performance"

# Generate security rules
"Create Firestore security rules for the reports collection ensuring:
- Only authenticated users can read
- Only users with role 'admin' or 'manager' can write
- Users can only see reports for their assigned projects"
```

### 3. Code Refactoring

```bash
# Improve type safety
"Add comprehensive TypeScript interfaces for the contractor-project relationship in src/app/shared/models/"

# Component optimization
"Refactor the task-management component to use OnPush change detection and optimize re-renders"
```

### 4. Testing

```bash
# Generate unit tests
"Create unit tests for daily-kpis-enhanced-form.component.ts covering:
- Form validation
- Data submission
- Error handling
- Integration with KPI service"

# E2E test scenarios
"Generate Cypress e2e tests for the contractor onboarding flow"
```

### 5. Bulk Operations

```bash
# Update imports
"Update all components in src/app/features/contractors to use the new shared KPI models"

# Style updates
"Convert all contractor module SCSS files to use our new CSS custom properties for theming"
```

## Working with Project Context

### Create gemini.md
```bash
"Create a gemini.md file that documents:
- Our project structure and naming conventions
- Key services and their purposes
- Common patterns we use
- Testing requirements
- Git workflow"
```

### Example gemini.md Content
```markdown
# FibreFlow Development Context

## Architecture
- Feature-based module structure
- Lazy-loaded routes
- Shared services in core/
- Reusable components in shared/

## Patterns
- Reactive forms with strong typing
- Observables for data flow
- OnPush change detection where possible
- Error interceptors for API calls

## Testing Standards
- Unit tests for services and components
- Integration tests for Firebase operations
- E2E tests for critical user flows
```

## MCP Server Setup (Advanced)

```bash
# Example: GitHub integration
"Set up MCP server for GitHub to:
- Fetch issues directly
- Create PRs from implementations
- Update issue status"

# Example: Custom tooling
"Configure MCP server for our Firebase admin tasks"
```

## Best Practices

### 1. **Start with Context**
```bash
"Analyze the contractors module structure and understand the patterns used"
```

### 2. **Be Specific**
```bash
# Good
"Create a service method in contractor.service.ts to calculate contractor performance ratings based on completion rate and deadline adherence"

# Less effective
"Add a rating feature"
```

### 3. **Incremental Changes**
```bash
"First, show me the current implementation of the contractor list component"
"Now, add pagination with 20 items per page"
```

### 4. **Verify Changes**
```bash
"Run ng test for the contractors module and show me any failures"
"Run ng lint and fix any issues found"
```

## Daily Workflow Example

```bash
# Morning: Check tasks
"What are the open GitHub issues for FibreFlow?"

# Implementation
"Implement issue #123 about contractor payment tracking"

# Testing
"Generate tests for the new payment tracking feature"

# Documentation
"Update the API documentation for the new payment endpoints"

# Review
"Show me all changes made today and create a summary for the team"
```

## Troubleshooting

### Rate Limits
- Free tier: 1000 requests/day
- Monitor usage with token count shown after each response
- Complex tasks may use multiple requests

### Context Window
- Large files may need splitting
- Use "analyze this file in chunks" for very large components

### File Permissions
- If prompted repeatedly, check "Always allow"
- Can revoke permissions with `/config permissions`

## Next Steps

1. **Experiment**: Try simple tasks first
2. **Document**: Add learned patterns to gemini.md
3. **Share**: Create team snippets for common tasks
4. **Optimize**: Find the best prompts for your workflow

Remember: Gemini CLI saves conversation context, so you can build on previous requests within a session!