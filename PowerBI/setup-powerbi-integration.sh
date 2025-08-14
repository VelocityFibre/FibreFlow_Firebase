#!/bin/bash

# PowerBI Integration Setup Script
# This script sets up the Neon database for PowerBI integration

set -e

echo "🚀 FibreFlow PowerBI Integration Setup"
echo "======================================"

# Load environment variables if .env exists
if [ -f "../.env.local" ]; then
    export $(cat ../.env.local | grep -v '^#' | xargs)
fi

# Prompt for Neon credentials if not in environment
if [ -z "$NEON_HOST" ]; then
    echo "Please enter your Neon database details:"
    read -p "Host (e.g., ep-xxx.neon.tech): " NEON_HOST
    read -p "Database name: " NEON_DATABASE
    read -p "Username: " NEON_USER
    read -sp "Password: " NEON_PASSWORD
    echo
fi

# Prompt for PowerBI reader password
echo
read -sp "Enter password for PowerBI reader user: " POWERBI_PASSWORD
echo

# Connection string
export PGPASSWORD=$NEON_PASSWORD
PSQL="psql -h $NEON_HOST -U $NEON_USER -d $NEON_DATABASE"

echo
echo "📊 Creating event tables and schema..."
$PSQL -f sql/01-create-event-tables.sql

echo
echo "🔍 Creating BI views..."
# Update the PowerBI password in the SQL
sed -i "s/PASSWORD 'changeme'/PASSWORD '$POWERBI_PASSWORD'/g" sql/01-create-event-tables.sql
$PSQL -f sql/02-create-bi-views.sql

echo
echo "🔧 Setting up Firebase function configuration..."
echo "Run these commands to configure Firebase:"
echo
echo "firebase functions:config:set neon.host=\"$NEON_HOST\""
echo "firebase functions:config:set neon.database=\"$NEON_DATABASE\""
echo "firebase functions:config:set neon.user=\"$NEON_USER\""
echo "firebase functions:config:set neon.password=\"$NEON_PASSWORD\""

echo
echo "📝 Creating .env template for functions..."
cat > ../functions/.env.template << EOF
# Neon Database Configuration
NEON_HOST=$NEON_HOST
NEON_DATABASE=$NEON_DATABASE
NEON_USER=$NEON_USER
NEON_PASSWORD=your_password_here
EOF

echo
echo "✅ Database setup complete!"
echo
echo "📋 Next steps:"
echo "1. Configure Firebase functions with the commands above"
echo "2. Deploy Firebase functions: firebase deploy --only functions"
echo "3. Share PowerBI connection details with Lew:"
echo "   - Host: $NEON_HOST"
echo "   - Database: $NEON_DATABASE"
echo "   - Username: powerbi_reader"
echo "   - Password: [the password you set]"
echo "   - Guide: PowerBI/POWERBI_CONNECTION_GUIDE.md"
echo
echo "🔄 To refresh materialized views periodically, set up a cron job:"
echo "   psql -c 'SELECT bi_views.refresh_all_materialized_views();'"

# Create a connection test script
cat > test-powerbi-connection.sh << 'EOF'
#!/bin/bash
# Test PowerBI connection

echo "Testing PowerBI reader connection..."
PGPASSWORD=$1 psql -h ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech \
  -U powerbi_reader -d neondb \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'bi_views';"
EOF

chmod +x test-powerbi-connection.sh

echo
echo "💡 Test the PowerBI connection with:"
echo "   ./test-powerbi-connection.sh <powerbi_password>"