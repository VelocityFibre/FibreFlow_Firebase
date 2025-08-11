#!/bin/bash

# PostgreSQL Setup Script for FibreFlow Staging
# This script sets up the PostgreSQL database for direct Excel imports

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== PostgreSQL Setup for FibreFlow Staging ===${NC}"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not installed!${NC}"
    echo "Install with: sudo pacman -S postgresql"
    exit 1
fi

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo -e "${YELLOW}PostgreSQL is not running. Starting...${NC}"
    sudo systemctl start postgresql
fi

# Database configuration
DB_NAME="fibreflow_staging"
DB_USER="fibreflow_user"
DB_PASS="fibreflow_pass"

echo "Creating database and user..."

# Create database and user
sudo -u postgres psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the database and create extensions
\c ${DB_NAME}

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geography types (optional)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pgcrypto for additional functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOF

echo -e "${GREEN}✓ Database created${NC}"

# Create schema
echo "Creating database schema..."

PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} <<'EOF'
-- Create tables matching Supabase/OneMap structure

-- Status tracking table
CREATE TABLE IF NOT EXISTS status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT,
    old_status TEXT,
    new_status TEXT,
    changed_at TIMESTAMP,
    source_file TEXT,
    row_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poles table
CREATE TABLE IF NOT EXISTS poles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pole_number TEXT UNIQUE NOT NULL,
    project_id TEXT,
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    address TEXT,
    status TEXT,
    contractor TEXT,
    installation_date DATE,
    data JSONB,
    status_history JSONB[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drops table
CREATE TABLE IF NOT EXISTS drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_number TEXT UNIQUE NOT NULL,
    pole_number TEXT REFERENCES poles(pole_number),
    property_id TEXT,
    address TEXT,
    status TEXT,
    installation_date DATE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT UNIQUE NOT NULL,
    address TEXT,
    suburb TEXT,
    city TEXT,
    postal_code TEXT,
    status TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import batches for tracking
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT UNIQUE NOT NULL,
    file_name TEXT,
    import_date TIMESTAMPTZ DEFAULT NOW(),
    total_rows INTEGER,
    imported_rows INTEGER,
    failed_rows INTEGER,
    status TEXT,
    errors JSONB,
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poles_project ON poles(project_id);
CREATE INDEX IF NOT EXISTS idx_poles_status ON poles(status);
CREATE INDEX IF NOT EXISTS idx_drops_pole ON drops(pole_number);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_status_changes_property ON status_changes(property_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_date ON status_changes(changed_at);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_poles_updated_at BEFORE UPDATE ON poles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drops_updated_at BEFORE UPDATE ON drops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint for max drops per pole
CREATE OR REPLACE FUNCTION check_max_drops_per_pole()
RETURNS TRIGGER AS $$
DECLARE
    drop_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO drop_count
    FROM drops
    WHERE pole_number = NEW.pole_number;
    
    IF drop_count >= 12 THEN
        RAISE EXCEPTION 'Pole % already has maximum 12 drops', NEW.pole_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_drops_per_pole
    BEFORE INSERT ON drops
    FOR EACH ROW EXECUTE FUNCTION check_max_drops_per_pole();

EOF

echo -e "${GREEN}✓ Schema created${NC}"

# Update config file with connection details
echo "Updating configuration..."
cat > config/postgres-connection.json <<EOF
{
  "development": {
    "host": "localhost",
    "port": 5432,
    "database": "${DB_NAME}",
    "user": "${DB_USER}",
    "password": "${DB_PASS}"
  }
}
EOF

echo -e "${GREEN}✓ Configuration saved${NC}"

# Test connection
echo "Testing connection..."
PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Connection successful${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo "Password: ${DB_PASS}"
echo "Host: localhost"
echo "Port: 5432"
echo ""
echo "Next steps:"
echo "1. Import Excel data: node scripts/import-excel-to-postgres.js"
echo "2. Validate data: node scripts/cross-validate-databases.js"
echo "3. Sync to Supabase: ./scripts/postgres-to-supabase-sync.sh"