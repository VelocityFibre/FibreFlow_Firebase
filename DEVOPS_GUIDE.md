# DevOps Tools Guide for FibreFlow

## Quick Commands

### Before Deploying to Firebase
```bash
npm run deploy
```
This automatically runs:
1. **Lint check** - Ensures code quality
2. **Format check** - Ensures consistent formatting
3. **Build** - Verifies the app builds successfully
4. Then deploys to Firebase

### Daily Development Commands

```bash
# Check everything (lint, format, build)
npm run check

# Fix all issues automatically
npm run check:fix

# Individual commands
npm run lint          # Check code quality
npm run lint:fix      # Fix code issues
npm run format        # Format all code
npm run format:check  # Check formatting

# Deploy options
npm run deploy           # Full deploy (hosting + rules)
npm run deploy:hosting   # Deploy only hosting
npm run deploy:rules     # Deploy only Firestore rules
```

## What Each Tool Does

### ESLint
- Catches code quality issues
- Finds potential bugs
- Enforces Angular best practices
- Warns about:
  - Unused variables
  - Console.log statements
  - Type safety issues

### Prettier
- Formats code consistently
- Fixes:
  - Indentation
  - Quote styles
  - Line lengths
  - Trailing commas

## Common Issues & Fixes

### "Lint errors found"
```bash
npm run lint:fix  # Fixes most issues automatically
```

### "Format check failed"
```bash
npm run format  # Formats all files
```

### "Build failed"
Check TypeScript errors - these must be fixed manually.

## Workflow Example

1. Make your changes in Claude Code
2. Before deploying:
   ```bash
   npm run check:fix  # Fix what can be fixed
   npm run deploy     # Deploy if everything passes
   ```

## Configuration Files

- `.eslintrc.json` - ESLint rules
- `.prettierrc.json` - Prettier formatting rules
- `.prettierignore` - Files to skip formatting
- `package.json` - All npm scripts

## Benefits

1. **Consistent Code** - Everyone's code looks the same
2. **Catch Bugs Early** - Before they reach Firebase
3. **Save Time** - Automated fixes for common issues
4. **Better Collaboration** - Standard code style