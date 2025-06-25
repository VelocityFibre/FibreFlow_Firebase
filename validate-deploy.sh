#!/bin/bash
# Deployment validation script

echo "🔍 Running deployment validation..."

# 1. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "❌ Uncommitted changes detected!"
    git status -s
    echo "Please commit all changes before deploying."
    exit 1
fi

# 2. Run build
echo "🏗️ Building project..."
if ! npm run build; then
    echo "❌ Build failed!"
    exit 1
fi

# 3. Check if all referenced components exist
echo "📁 Checking component files..."
MISSING_FILES=0
while IFS= read -r import_line; do
    # Extract the import path
    if [[ $import_line =~ import\(\'([^\']+)\'\) ]]; then
        FILE_PATH="${BASH_REMATCH[1]}"
        # Convert relative to absolute path
        if [[ ! -f "src/app/${FILE_PATH}.ts" ]]; then
            echo "❌ Missing file: src/app/${FILE_PATH}.ts"
            MISSING_FILES=$((MISSING_FILES + 1))
        fi
    fi
done < <(grep -r "import(" src/app --include="*.routes.ts" | grep -v node_modules)

if [[ $MISSING_FILES -gt 0 ]]; then
    echo "❌ Found $MISSING_FILES missing component files!"
    exit 1
fi

# 4. Success
echo "✅ Validation passed! Ready to deploy."
echo ""
echo "Next steps:"
echo "1. Deploy to preview: ./deploy.sh preview branch-name 7d"
echo "2. Test preview URL"
echo "3. Merge to master: git checkout master && git merge branch-name"
echo "4. Deploy to production: ./deploy.sh prod"