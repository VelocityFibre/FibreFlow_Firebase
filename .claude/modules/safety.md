# Safety Protocols - Detailed Guide

<module-metadata>
  <name>safety</name>
  <version>1.0</version>
  <priority>critical</priority>
  <last-updated>2025-07-18</last-updated>
</module-metadata>

## 🛡️ CODE LOSS PREVENTION

### Critical Discovery: jj Affects Live Apps
**⚠️ IMPORTANT**: Even after code is built and deployed, jj commands can still affect the live application! This happens because:
- jj commands change working directory files
- Angular build process reads from working directory
- Next deployment uses changed files
- **Result**: Live app changes even though it was "already deployed"

### Dangerous Commands Reference

#### `jj new` - EXTREME DANGER
```bash
# What it does: Creates new commit, ABANDONS current work
# Impact: All uncommitted changes disappear
# Recovery: Use `jj op log` and `jj op restore`

# SAFE alternative:
jj commit -m "Save current work"
jj new  # Now safe to create new commit
```

#### `jj abandon` - PERMANENT DELETION
```bash
# What it does: Permanently deletes commits
# Impact: Cannot be recovered easily
# 
# REQUIRE this confirmation:
echo "Type CONFIRM to permanently delete commit:"
read confirmation
[[ "$confirmation" == "CONFIRM" ]] || exit 1
```

#### `git reset --hard` - DESTROYS CHANGES
```bash
# Impact: All uncommitted changes lost
# Safe alternative:
git stash save "Backup before reset"
git reset --hard
# Can recover with: git stash pop
```

### Recovery Procedures

#### Lost Code Recovery
```bash
# 1. Check operation log
jj op log

# 2. Find the operation before disaster
# Look for timestamp like "10:45 AM"

# 3. Restore to that point
jj op restore d3b59755a743  # Use actual operation ID

# 4. Verify restoration
jj st
ls -la src/app/features/
```

#### GitHub Push Blocked (API Keys)
```bash
# DO NOT remove API keys from code!
# Instead:

# 1. Add files to .gitignore
echo "src/app/core/services/direct-anthropic.service.ts" >> .gitignore
echo "test-anthropic-api.js" >> .gitignore

# 2. Remove from git tracking
git rm --cached src/app/core/services/direct-anthropic.service.ts
git rm --cached test-anthropic-api.js

# 3. Commit and push
git add .gitignore
git commit -m "Add API key files to gitignore"
git push
```

### Prevention Strategies

#### 1. Always Check First
```bash
# Before ANY jj command:
jj st  # What will be affected?
jj diff  # What changes exist?

# Before rm:
ls -la [target]  # Verify what you're deleting
```

#### 2. Backup Critical Work
```bash
# Quick backup before risky operations:
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz src/
```

#### 3. Use Aliases for Safety
```bash
# Add to ~/.bashrc or ~/.zshrc:
alias jj-new='echo "WARNING: This will abandon current work! Use jj-safe-new instead"'
alias jj-safe-new='jj commit -m "Auto-save before new" && jj new'
```

## 🔐 API Key Management

### Standard Approach
**NEVER delete API keys from code!** Always use `.gitignore`:

```bash
# Good practice:
1. Keep API keys in development files
2. Add those files to .gitignore
3. Use environment variables in production
4. Document in .env.example (without values)
```

### Common Files with Secrets
```
.env.local
src/environments/environment.local.ts
**/api-keys.ts
**/credentials.ts
test-*.js  # Test files often have keys
```

## 🚀 Production Safety

### Deployment Impact Chain
```
Working Directory → Build Process → Deployment → Live App
     ↑                                              ↓
     └──────────── jj/git commands affect ─────────┘
```

### Pre-Deployment Checklist
```bash
#!/bin/bash
# Run before EVERY deployment

echo "🔍 Pre-deployment Safety Check"

# 1. Check for API keys
if grep -r "sk-ant-api" src/ --exclude-dir=node_modules; then
  echo "❌ FOUND API KEYS! Add to .gitignore first"
  exit 1
fi

# 2. Verify build
npm run build || { echo "❌ Build failed"; exit 1; }

# 3. Check working directory
if [[ -n $(jj st -s) ]]; then
  echo "⚠️  Uncommitted changes detected"
  jj st
fi

echo "✅ Safe to deploy"
```

## 📋 Emergency Procedures

### If Code Disappears
1. **DON'T PANIC**
2. Check `jj op log` immediately
3. Find last known good state
4. Run `jj op restore [operation-id]`
5. Verify with `jj st` and test files

### If Deployment Breaks Production
1. Check Firebase Console → Hosting → Version History
2. Click "Rollback" on previous version
3. Investigate what changed in working directory
4. Fix and redeploy carefully

### If GitHub Blocks Push
1. Check error message for specific file
2. Add file to .gitignore
3. Remove from git cache
4. Try push again

## 🧠 Fundamental Safety Principles

### Systems Thinking
Every action affects the entire system:
- Version control → Working directory
- Working directory → Build process  
- Build process → Deployment
- Deployment → Live users

### Production Mindset
Before ANY command, ask:
1. How does this affect the live app?
2. What happens on next deployment?
3. Can users be impacted?
4. Is there a safer way?

### Double Confirmation Pattern
For any destructive operation:
```typescript
async function confirmDangerousAction(action: string): Promise<boolean> {
  console.log(`⚠️  WARNING: About to ${action}`);
  console.log("This action cannot be undone!");
  console.log("Type CONFIRM to proceed:");
  
  const response = await getUserInput();
  return response === "CONFIRM";
}
```

## 🎯 Golden Rules

1. **Working directory is sacred** - It's your production source
2. **Every jj command matters** - Even after deployment
3. **API keys stay in code** - Use .gitignore, not deletion
4. **Test with deploy** - Never trust local testing
5. **Backup before risk** - 30 seconds saves 3 hours

---

Remember: It's not paranoia if it actually happened! These rules come from real incidents and real recovery efforts.