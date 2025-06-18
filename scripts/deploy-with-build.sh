#!/bin/bash

echo "🚀 FibreFlow Build and Deploy Script"
echo "===================================="
echo ""

# Ensure we're using the correct Node version
if command -v nvm &> /dev/null; then
    echo "📌 Loading nvm and switching to Node v20..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 20 || nvm install 20
    echo "✅ Using Node $(node --version)"
else
    echo "⚠️  nvm not found, using system Node.js"
fi

echo ""
echo "🔧 Step 1: Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🚀 Step 2: Deploying to Firebase..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed! Please check the errors above."
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo "Your app is live at: https://fibreflow-73daf.web.app"
echo ""