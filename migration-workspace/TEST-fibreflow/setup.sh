#!/bin/bash

echo "🧪 Setting up TEST Environment for FibreFlow Migration"
echo "=================================================="
echo ""

# Check if migrator exists
if [ ! -d "migrator" ]; then
  echo "❌ Error: migrator directory not found"
  echo "Please copy the migration tool first"
  exit 1
fi

cd migrator

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file
echo ""
echo "🔧 Creating .env configuration..."
cat > .env << 'EOF'
# TEST Environment Configuration
FIREBASE_PROJECT_ID=fibreflow-test
AIRTABLE_API_KEY=YOUR_AIRTABLE_API_KEY_HERE
AIRTABLE_BASE_ID=appkYMgaK0cHVu4Zg

# Migration Settings
BATCH_SIZE=100
DRY_RUN=false
LOG_LEVEL=info
EOF

# Create service account placeholder
echo ""
echo "📄 Creating service account placeholder..."
cat > service-account-setup.md << 'EOF'
# Service Account Setup for TEST Environment

1. Go to Firebase Console:
   https://console.firebase.google.com/project/fibreflow-test/settings/serviceaccounts/adminsdk

2. Click "Generate new private key"

3. Save the downloaded file as: service-account.json

4. Place it in this directory (migrator/)

⚠️ NEVER commit this file to git!
EOF

# Create test verification script
cat > verify-setup.js << 'EOF'
const fs = require('fs');
const chalk = require('chalk');

console.log(chalk.blue('🔍 Verifying TEST environment setup...\n'));

// Check .env
if (fs.existsSync('.env')) {
  console.log(chalk.green('✅ .env file exists'));
  const env = fs.readFileSync('.env', 'utf-8');
  if (env.includes('fibreflow-test')) {
    console.log(chalk.green('✅ Configured for TEST environment'));
  } else {
    console.log(chalk.red('❌ Not configured for TEST environment!'));
  }
} else {
  console.log(chalk.red('❌ .env file missing'));
}

// Check service account
if (fs.existsSync('service-account.json')) {
  console.log(chalk.green('✅ service-account.json exists'));
  try {
    const sa = JSON.parse(fs.readFileSync('service-account.json', 'utf-8'));
    if (sa.project_id && sa.project_id.includes('test')) {
      console.log(chalk.green('✅ Service account is for TEST project'));
    } else {
      console.log(chalk.yellow('⚠️  Service account might not be for TEST'));
    }
  } catch (e) {
    console.log(chalk.red('❌ Invalid service account JSON'));
  }
} else {
  console.log(chalk.yellow('⚠️  service-account.json missing - see service-account-setup.md'));
}

// Check Airtable API key
const envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf-8') : '';
if (envContent.includes('YOUR_AIRTABLE_API_KEY_HERE')) {
  console.log(chalk.yellow('⚠️  Remember to add your Airtable API key to .env'));
} else if (envContent.includes('AIRTABLE_API_KEY=')) {
  console.log(chalk.green('✅ Airtable API key configured'));
}

console.log(chalk.blue('\n📋 Next steps:'));
console.log('1. Add your Airtable API key to .env');
console.log('2. Download and add service-account.json');
console.log('3. Run: npm run migrate -- --dry-run');
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env and add your Airtable API key"
echo "2. Add service-account.json (see service-account-setup.md)"
echo "3. Run: node verify-setup.js"
echo "4. Test with: npm run migrate -- --dry-run"