# FibreFlow jj Workflow - Quick Reference

## Why This Workflow?

As a solo developer, you want to:
- Deploy what you build immediately
- No confusion from uncommitted changes
- Focus on building, not git commands

## Your New Workflow

### 1. Make changes to your code
Just edit files normally. Everything is automatically tracked by jj.

### 2. Deploy when ready
```bash
deploy
```
That's it! This single command:
- Commits all your changes
- Pushes to GitHub  
- Builds your project
- Deploys to Firebase

### 3. Optional: Custom message
```bash
deploy "Added user authentication"
```

## Available Commands

### From anywhere:
- `ff` - Jump to FibreFlow directory
- `ffd` - Jump to FibreFlow and deploy immediately

### When in FibreFlow directory:
- `deploy` - Commit everything and deploy (same as `./deploy.sh`)
- `jj-status` - See what files changed
- `jj-diff` - See actual changes
- `jj-log` - View recent history
- `jj-sync` - Just commit and push (no deploy)

### Deploy script options:
- `./deploy.sh` - Quick deploy with timestamp
- `./deploy.sh "message"` - Quick deploy with custom message
- `./deploy.sh preview` - Deploy to preview channel
- `./deploy.sh commit "message"` - Just commit, no deploy

## Examples

### Daily workflow:
```bash
# Start work
ff

# Make changes...
# Test locally...

# Deploy everything
deploy

# Or with a message
deploy "Fixed bug in reporting module"
```

### Preview deployment:
```bash
./deploy.sh preview new-feature
```

### Just commit without deploying:
```bash
./deploy.sh commit "Work in progress"
```

## Key Differences from Git

1. **No staging** - All changes are tracked automatically
2. **No add command** - Files are included automatically  
3. **No branches needed** - Work directly on main
4. **Every change is safe** - jj tracks everything, easy to undo

## Troubleshooting

### See what will be deployed:
```bash
jj-status
jj-diff
```

### Undo last change:
```bash
jj undo
```

### View history:
```bash
jj-log
```

## Remember

- **One command to deploy**: `deploy`
- **Everything is tracked automatically**
- **No need to worry about git commands**
- **Focus on building your app**

---

*Updated: 2025-07-07*