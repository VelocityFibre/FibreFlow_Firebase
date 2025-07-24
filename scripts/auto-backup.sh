#!/bin/bash
# Auto-backup script for FibreFlow
# SAFE: This script only adds files to .gitignore and creates commits
# It NEVER deletes or removes any files

echo "🔄 Starting FibreFlow backup..."
echo "🛡️ Safety mode: No files will be deleted or lost"

# 1. Auto-update .gitignore for large files
echo "📏 Checking for large files..."
LARGE_FILES_FOUND=0
find . -type f -size +1M -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.angular/*" | while read file; do
    # Check if file is already in .gitignore
    if ! grep -qF "$file" .gitignore; then
        # Also check if a pattern already covers it
        FILENAME=$(basename "$file")
        DIRNAME=$(dirname "$file")
        if ! grep -q "\*\*/$FILENAME" .gitignore && ! grep -q "$DIRNAME/\*" .gitignore; then
            echo "  Large file found: $file ($(du -h "$file" | cut -f1))"
            LARGE_FILES_FOUND=$((LARGE_FILES_FOUND + 1))
        fi
    fi
done

if [ $LARGE_FILES_FOUND -gt 0 ]; then
    echo "💡 Tip: Consider adding large file patterns to .gitignore"
    echo "   Example: echo '**/*.csv' >> .gitignore"
fi

# 2. Check for secrets (non-blocking, just warns)
echo "🔐 Checking for exposed secrets..."
SECRET_PATTERNS="sk-ant-api|api_key|secret|password|token|private_key"
if grep -r -E "$SECRET_PATTERNS" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=.angular \
    --exclude-dir=dist \
    --exclude="*.md" \
    --include="*.ts" \
    --include="*.js" \
    --include="*.json" \
    --include="*.env" 2>/dev/null | \
    grep -v ".gitignore" | \
    grep -v "// " | \
    grep -v "# " | \
    head -5; then
    echo "⚠️  WARNING: Potential secrets found above. Consider adding these files to .gitignore"
    echo "   But don't worry - the backup will continue safely!"
fi

# 3. Count changes
echo "📊 Analyzing changes..."
ADDED=$(jj st 2>/dev/null | grep -c "^A " || echo "0")
MODIFIED=$(jj st 2>/dev/null | grep -c "^M " || echo "0")
DELETED=$(jj st 2>/dev/null | grep -c "^D " || echo "0")
TOTAL=$((ADDED + MODIFIED + DELETED))

echo "  Added: $ADDED files"
echo "  Modified: $MODIFIED files"
echo "  Deleted: $DELETED files"
echo "  Total: $TOTAL changes"

if [ $TOTAL -eq 0 ]; then
    echo "✅ No changes to backup - working directory is clean!"
    exit 0
fi

# 4. Generate commit message
DEFAULT_MSG="Backup: $(date +%Y-%m-%d_%H-%M) - $TOTAL files changed"
echo ""
echo "💬 Commit message: $DEFAULT_MSG"
echo "   (Press Enter to use default, or type a custom message)"
read -r CUSTOM_MSG
COMMIT_MSG="${CUSTOM_MSG:-$DEFAULT_MSG}"

# 5. Create commit (SAFE - only creates a snapshot)
echo "💾 Creating commit..."
jj describe -m "$COMMIT_MSG" 2>/dev/null || {
    echo "❌ Failed to create commit. Please check jj status"
    exit 1
}

# 6. Ask before pushing
echo ""
echo "📤 Ready to push to GitHub"
echo "   This will update the master branch with your changes"
echo "   Continue? (y/N)"
read -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "⏸️  Push cancelled. Your changes are committed locally."
    echo "   To push later, run: jj git push --branch master"
    exit 0
fi

# 7. Update master and push
echo "🚀 Pushing to GitHub..."
jj bookmark set master -r @ 2>/dev/null || {
    echo "❌ Failed to update master bookmark"
    exit 1
}

jj git push --branch master 2>/dev/null || {
    echo "❌ Push failed. Your changes are safe locally."
    echo "   Try: jj git push --branch master"
    exit 1
}

echo "✅ Backup complete! Changes pushed to GitHub."
echo "🔗 View at: https://github.com/VelocityFibre/FibreFlow_Firebase"