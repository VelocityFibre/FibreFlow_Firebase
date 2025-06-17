#!/bin/bash

# 🔄 Automated Logging System Restoration Script
echo "🔄 Restoring Logging System..."

# Create directories
echo "📁 Creating directories..."
mkdir -p src/app/features/debug/

# Copy files
echo "📄 Copying service files..."
cp backup/logging-system/remote-logger.service.ts src/app/core/services/
cp backup/logging-system/debug-logs.component.ts src/app/features/debug/
cp backup/logging-system/error-handler.service.ts.enhanced src/app/core/services/error-handler.service.ts

echo "✅ Logging system files restored!"
echo ""
echo "📋 Next manual steps:"
echo "1. Add debug-logs route to app.routes.ts"
echo "2. Add 'Debug Logs' menu item to app-shell.component.ts"
echo "3. Verify ErrorHandlerService provider in app.config.ts"
echo ""
echo "📖 See RESTORE_INSTRUCTIONS.md for detailed steps"