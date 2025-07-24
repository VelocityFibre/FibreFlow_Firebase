#!/bin/bash
# Check for large files that should be in .gitignore
# SAFE: Read-only script, just reports findings

echo "🔍 Checking for large files not in .gitignore..."

FOUND_ISSUES=0

# Find large files
find . -type f -size +1M \
    -not -path "./.git/*" \
    -not -path "./node_modules/*" \
    -not -path "./.angular/*" \
    -not -path "./dist/*" \
    -not -path "./.cache/*" | while read -r file; do
    
    # Check if file or pattern is in .gitignore
    FILENAME=$(basename "$file")
    DIRNAME=$(dirname "$file")
    
    # Check exact path
    if grep -qF "$file" .gitignore; then
        continue
    fi
    
    # Check if covered by patterns
    if grep -q "\*\*/$FILENAME" .gitignore; then
        continue
    fi
    
    if grep -q "$DIRNAME/\*" .gitignore; then
        continue
    fi
    
    # Get file size
    SIZE=$(du -h "$file" | cut -f1)
    echo "⚠️  Large file: $file ($SIZE)"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
done

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ All large files are properly ignored!"
else
    echo ""
    echo "💡 To fix, add patterns to .gitignore:"
    echo "   echo '**/*.csv' >> .gitignore"
    echo "   echo '**/*.xlsx' >> .gitignore"
    echo "   echo '**/downloads/' >> .gitignore"
fi

exit 0  # Always exit successfully (non-blocking)