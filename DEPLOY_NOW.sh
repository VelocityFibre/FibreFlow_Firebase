#!/bin/bash

echo "🚀 FibreFlow Firebase Deployment Script"
echo "======================================"
echo ""

echo "📦 Step 1: Installing Firebase CLI globally..."
npm install -g firebase-tools

echo ""
echo "🔐 Step 2: Login to Firebase..."
firebase login

echo ""
echo "🔧 Step 3: Initialize Firebase Hosting..."
echo "When prompted:"
echo "- Choose: Hosting (press SPACE to select, then ENTER)"
echo "- Use existing project: fibreflow-73daf"
echo "- Public directory: dist/fibreflow/browser"
echo "- Single-page app: Yes"
echo "- Set up automatic builds: No"
echo "- Overwrite index.html: No"
echo ""
firebase init

echo ""
echo "🚀 Step 4: Deploy to Firebase..."
firebase deploy

echo ""
echo "✅ Deployment complete!"
echo "Your app is live at: https://fibreflow-73daf.web.app"
echo ""