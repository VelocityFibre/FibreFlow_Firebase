#!/bin/bash

echo "🚀 Setting up Argon Agent for local development..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 20+"
    exit 1
else
    echo "✅ Node.js $(node --version) detected"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required. Please install npm"
    exit 1
else
    echo "✅ npm $(npm --version) detected"
fi

echo ""

# Setup environment
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists"
else
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: Update .env.local with your database credentials:"
    echo "   - NEON_CONNECTION_STRING"
    echo "   - FIREBASE_API_KEY (from Firebase Console)"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd ../.. # Go to project root
npm install
cd agents/argon

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p temp

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "1. Update .env.local with your credentials"
echo "2. From project root, run: npm run build"
echo "3. Test locally with: npm start"
echo "4. For Neon access, ensure your IP is whitelisted in Neon Console"
echo ""
echo "🔗 Database connections:"
echo "- Firestore: Uses Firebase Web SDK (browser-based)"
echo "- Neon: Direct PostgreSQL connection (requires connection string)"
echo ""
echo "💡 Tip: Run 'node test-argon-connections.js' in browser console to test"