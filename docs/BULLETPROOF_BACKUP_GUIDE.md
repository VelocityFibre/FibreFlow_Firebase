# 🛡️ Bulletproof Backup Guide - Never Lose Code Again

*Created: 2025-07-18*  
*Status: CRITICAL - Read Before Any Backup*

## 🚨 The Golden Rule

**NEVER use `jj new` or `jj abandon` - They delete your code!**

## ✅ Safe Backup Procedure

### Step 1: Check Your Code is Safe
```bash
# Always check what you have first
jj st
```

### Step 2: Handle API Keys BEFORE Pushing
```bash
# Check if any API keys exist
grep -r "sk-ant-api" . --exclude-dir=node_modules || echo "No API keys found"

# If API keys found, add files to .gitignore
echo "path/to/file-with-api-key" >> .gitignore
git rm --cached path/to/file-with-api-key
```

### Step 3: Commit with jj (Safe)
```bash
# Create descriptive commit message
jj describe -m "Your commit message here"
```

### Step 4: Push to GitHub (Safe)
```bash
# Push using jj (safe method)
jj git push

# If that fails, use git directly
git add .gitignore  # Only if you updated it
git commit --amend --no-edit --no-verify
git push origin HEAD:master
```

## 🚫 DANGEROUS Commands - NEVER USE

```bash
# THESE COMMANDS DELETE YOUR CODE!
jj new          # Creates new commit, abandons current work
jj abandon      # Permanently deletes commits
jj undo         # Can lose recent work if used incorrectly
```

## 🔧 Emergency Recovery

If you accidentally lose code:

```bash
# Check operation history
jj op log

# Find the operation BEFORE the problem
# Look for timestamps before the chaos

# Restore to that point
jj op restore [operation-id]

# Example:
jj op restore d3b59755a743
```

## 🔐 API Key Management

### Safe Storage
```bash
# Store in .env.local (never committed)
echo "ANTHROPIC_API_KEY=your-key-here" >> .env.local

# Add to .gitignore
echo ".env.local" >> .gitignore
echo "*.env" >> .gitignore
```

### Files to Always Ignore
Add to `.gitignore`:
```
# API Keys - NEVER commit these
src/app/core/services/direct-anthropic.service.ts
test-anthropic-api.js
test-browser-api.html
functions/firebase-debug.log
*.env
.env.local
*-service-account.json
```

## 📋 Pre-Push Checklist

Before EVERY push to GitHub:

- [ ] `jj st` - Check what's being committed
- [ ] `grep -r "sk-ant-api" . --exclude-dir=node_modules` - No API keys
- [ ] `grep -r "service-account" . --exclude-dir=node_modules` - No service account files
- [ ] Files with secrets are in `.gitignore`
- [ ] Use `git rm --cached filename` to remove from git if needed

## 🔄 Daily Backup Routine

```bash
# 1. Check status
jj st

# 2. Describe current work
jj describe -m "End of day backup: [describe what you did]"

# 3. Push to GitHub
jj git push

# 4. Verify on GitHub
# Check https://github.com/VelocityFibre/FibreFlow_Firebase
```

## 🆘 What to Do If Push is Blocked

If GitHub blocks your push due to secrets:

1. **DON'T PANIC** - Your code is safe locally
2. **DON'T use `jj new` or `jj abandon`**
3. **Add files to `.gitignore`**:
   ```bash
   echo "filename-with-secret" >> .gitignore
   git rm --cached filename-with-secret
   git add .gitignore
   git commit --amend --no-edit --no-verify
   git push origin HEAD:master
   ```

## 🎯 Success Indicators

You'll know the backup worked when:
- ✅ `git push` returns "Everything up-to-date" or shows successful push
- ✅ Your code appears on GitHub: https://github.com/VelocityFibre/FibreFlow_Firebase
- ✅ No error messages about secrets or API keys
- ✅ Your local files are unchanged

## 🚨 Crisis Recovery Stories

### The jQuery Incident (2025-07-18)
- **Problem**: Code disappeared after `jj new master` and `jj abandon`
- **Solution**: `jj op restore d3b59755a743` to recover 230 files
- **Lesson**: NEVER use `jj new` or `jj abandon`

### The API Key Push Block (2025-07-18)
- **Problem**: GitHub blocked push due to API keys in files
- **Solution**: Add files to `.gitignore`, remove from git cache
- **Lesson**: Always check for secrets before pushing

## 🔧 Tools for Safety

### Check for API Keys
```bash
# Find all API keys
find . -name "*.ts" -o -name "*.js" -o -name "*.html" | xargs grep -l "sk-ant-api"

# Find service account files
find . -name "*service-account*" -o -name "*.json" | grep -i service
```

### Backup Verification
```bash
# Check last commit on GitHub
git log --oneline -1

# Check what's in current commit
git show --name-only HEAD
```

## 📝 Remember

1. **Your code is precious** - Treat it like gold
2. **GitHub is your safety net** - Push often
3. **API keys are dangerous** - Keep them out of git
4. **jj operations are recoverable** - But prevention is better
5. **When in doubt, ask for help** - Don't experiment with dangerous commands

---

*This guide was created after a near-catastrophic code loss incident. Follow it religiously to avoid the same fate.*