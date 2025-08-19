#!/bin/bash

# Nokia Data Import Test Script
echo "🧪 Nokia Data Import - Test Script"
echo "=================================="

# Check if NEON_CONNECTION_STRING is set
if [ -z "$NEON_CONNECTION_STRING" ]; then
    echo "❌ Error: NEON_CONNECTION_STRING environment variable is required"
    echo "   Please set it in your .env file or export it:"
    echo "   export NEON_CONNECTION_STRING='postgresql://user:pass@host/database'"
    exit 1
fi

# Check if Nokia Export.xlsx exists
EXCEL_FILE="/home/ldp/Downloads/Nokia Export.xlsx"
if [ ! -f "$EXCEL_FILE" ]; then
    echo "❌ Error: Nokia Export.xlsx not found at $EXCEL_FILE"
    echo "   Please ensure the file exists or provide the correct path"
    exit 1
fi

echo "✅ Environment check passed"
echo "✅ Excel file found: $EXCEL_FILE"
echo ""

# Check file size
FILE_SIZE=$(stat -c%s "$EXCEL_FILE")
echo "📁 File size: $(numfmt --to=iec $FILE_SIZE)"

# Show database connection (masked)
MASKED_DB=$(echo $NEON_CONNECTION_STRING | sed 's/\/\/[^@]*@/\/\/***:***@/')
echo "🗄️  Database: $MASKED_DB"
echo ""

# Ask for confirmation
read -p "🚀 Ready to import Nokia data? This may take 1-2 minutes. (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Starting import..."
    echo ""
    
    # Run the import
    node import-nokia-excel.js "$EXCEL_FILE"
    
    # Check exit status
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Import completed successfully!"
        echo "🌐 View data at: https://fibreflow-73daf.web.app/nokia-data"
    else
        echo ""
        echo "❌ Import failed. Check error messages above."
        exit 1
    fi
else
    echo "⏹️  Import cancelled."
    exit 0
fi