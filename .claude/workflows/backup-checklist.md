# 🛡️ Quick Backup Checklist

## Safety First
This checklist helps you backup without losing any work. All operations are SAFE and non-destructive.

## 🚀 Quick Backup (One Command)
```bash
./scripts/auto-backup.sh
```

## 📋 Manual Backup Steps

### 1. Pre-flight checks (Optional but recommended)
```bash
# Check what's changed
jj st

# Check for large files
find . -type f -size +1M -name "*.csv" -o -name "*.json" | grep -v node_modules | head -10

# Quick secret scan (just to be aware)
grep -r "sk-ant-api\|api_key\|secret" . --exclude-dir=node_modules --include="*.ts" --include="*.js" | head -5
```

### 2. Backup commands
```bash
# Create commit with descriptive message
jj describe -m "Backup: Your description here"

# Update master bookmark to current commit
jj bookmark set master -r @

# Push to GitHub
jj git push --branch master
```

### 3. Verify
```bash
# Check latest commit
git log --oneline -1

# Or check jj log
jj log -r @ --limit 1
```

## 🔧 Common Situations

### Large files blocking commit
```bash
# Add to .gitignore
echo "path/to/large/file.csv" >> .gitignore

# Or add pattern for all CSV files
echo "**/*.csv" >> .gitignore
```

### API key found
```bash
# Add file to .gitignore
echo "src/file-with-key.ts" >> .gitignore

# Remove from git tracking (keeps local file)
git rm --cached src/file-with-key.ts
```

### Push fails
```bash
# Check current status
jj st
git status

# Try manual push
git push origin HEAD:master
```

## 🎯 Best Practices

1. **Backup frequently** - At least daily or after major changes
2. **Use descriptive messages** - Help your future self
3. **Check for secrets** - But don't panic, just add to .gitignore
4. **Large files** - Keep data files out of git

## ⚡ Quick Aliases

Add to your `~/.bashrc`:
```bash
# Quick backup with auto-message
alias jj-backup='jj describe -m "Backup: $(date +%Y-%m-%d_%H-%M)" && jj bookmark set master -r @ && jj git push --branch master'

# Check what needs backing up
alias jj-check='jj st | head -20'
```

## 🆘 Emergency Recovery

If something goes wrong:
```bash
# Check operation history
jj op log

# Restore to previous state (find ID from op log)
jj op restore [operation-id]
```

Remember: jj keeps history of all operations, so you can always recover!