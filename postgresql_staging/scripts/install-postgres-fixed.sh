#!/bin/bash

# Install PostgreSQL using official binaries (fixed download)
set -e

# Configuration
PG_VERSION="15.4"
INSTALL_DIR="$HOME/postgresql"
DATA_DIR="$HOME/postgresql_data"
PORT=5433

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== PostgreSQL Binary Installation (Fixed) ===${NC}"
echo ""

# Clean up any previous failed download
rm -f /tmp/postgresql-*.tar.gz

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$HOME/.local/bin"

# Try multiple download sources
echo -e "${YELLOW}Downloading PostgreSQL binaries...${NC}"
cd /tmp

# Source 1: PostgreSQL.org official
if ! wget -O "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" \
    "https://ftp.postgresql.org/pub/binary/v${PG_VERSION}/linux/postgresql-${PG_VERSION}-1-linux-x64-binaries.tar.gz" 2>/dev/null; then
    
    echo "Official source failed, trying mirror..."
    
    # Source 2: EnterpriseDB
    if ! wget -O "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" \
        "https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-1-linux-x64-binaries.tar.gz" 2>/dev/null; then
        
        echo -e "${RED}Download failed from all sources!${NC}"
        echo ""
        echo "Manual download option:"
        echo "1. Go to: https://www.enterprisedb.com/download-postgresql-binaries"
        echo "2. Download PostgreSQL 15.x Linux x86-64 binaries"
        echo "3. Save to /tmp/postgresql-15.4-linux-x64-binaries.tar.gz"
        echo "4. Re-run this script"
        exit 1
    fi
fi

# Verify the download
echo -e "${YELLOW}Verifying download...${NC}"
if ! file /tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz | grep -q "gzip compressed"; then
    echo -e "${RED}Downloaded file is not a valid gzip archive!${NC}"
    echo "File info:"
    file /tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz
    echo ""
    echo "The file might be corrupted or an HTML error page."
    echo "Please try downloading manually from:"
    echo "https://www.enterprisedb.com/download-postgresql-binaries"
    exit 1
fi

# Extract to install directory
echo -e "${YELLOW}Extracting binaries...${NC}"
cd "$INSTALL_DIR"
if ! tar -xzf "/tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" --strip-components=1; then
    echo -e "${RED}Extraction failed!${NC}"
    exit 1
fi

# Initialize database cluster
echo -e "${YELLOW}Initializing database...${NC}"
"$INSTALL_DIR/bin/initdb" -D "$DATA_DIR" -U postgres --auth-local=trust --auth-host=md5

# Configure PostgreSQL
echo -e "${YELLOW}Configuring PostgreSQL...${NC}"
cat >> "$DATA_DIR/postgresql.conf" << EOF

# Custom configuration for local development
port = $PORT
listen_addresses = 'localhost'
max_connections = 50
shared_buffers = 128MB
EOF

# Set password authentication for local connections
cat > "$DATA_DIR/pg_hba.conf" << EOF
# PostgreSQL Client Authentication Configuration File
local   all             postgres                                trust
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF

# Create helper scripts
echo -e "${YELLOW}Creating helper scripts...${NC}"

# Start script
cat > "$HOME/.local/bin/pg-start" << EOF
#!/bin/bash
echo "Starting PostgreSQL on port $PORT..."
if "$INSTALL_DIR/bin/pg_ctl" -D "$DATA_DIR" -l "$DATA_DIR/postgresql.log" start; then
    echo "✓ PostgreSQL started successfully!"
    echo "Log file: $DATA_DIR/postgresql.log"
else
    echo "✗ Failed to start PostgreSQL"
    echo "Check log: $DATA_DIR/postgresql.log"
    exit 1
fi
EOF

# Stop script
cat > "$HOME/.local/bin/pg-stop" << EOF
#!/bin/bash
echo "Stopping PostgreSQL..."
"$INSTALL_DIR/bin/pg_ctl" -D "$DATA_DIR" stop
EOF

# Status script
cat > "$HOME/.local/bin/pg-status" << EOF
#!/bin/bash
"$INSTALL_DIR/bin/pg_ctl" -D "$DATA_DIR" status
EOF

# Restart script
cat > "$HOME/.local/bin/pg-restart" << EOF
#!/bin/bash
echo "Restarting PostgreSQL..."
"$INSTALL_DIR/bin/pg_ctl" -D "$DATA_DIR" restart -l "$DATA_DIR/postgresql.log"
EOF

# Make scripts executable
chmod +x "$HOME/.local/bin/pg-start"
chmod +x "$HOME/.local/bin/pg-stop"
chmod +x "$HOME/.local/bin/pg-status"
chmod +x "$HOME/.local/bin/pg-restart"

# Update PATH in bashrc if needed
if ! grep -q "$INSTALL_DIR/bin" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# PostgreSQL local installation" >> ~/.bashrc
    echo "export PATH=\"$INSTALL_DIR/bin:\$PATH\"" >> ~/.bashrc
    echo "export PGDATA=\"$DATA_DIR\"" >> ~/.bashrc
    echo "export PGPORT=$PORT" >> ~/.bashrc
fi

# Update our database config
echo -e "${YELLOW}Updating database configuration...${NC}"
cat > config/database.json << EOF
{
  "postgres": {
    "host": "localhost",
    "port": $PORT,
    "database": "fibreflow_staging",
    "user": "postgres",
    "password": ""
  },
  "sqlite": {
    "path": "../OneMap/onemap.db",
    "description": "SQLite database for validation comparison"
  },
  "duckdb": {
    "path": "../OneMap/DuckDB/data/onemap.duckdb", 
    "description": "DuckDB for analytics validation"
  },
  "import": {
    "batchSize": 1000,
    "validateDuplicates": true,
    "trackStatusHistory": true,
    "maxDropsPerPole": 12
  }
}
EOF

# Clean up
rm -f "/tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz"

# Source the new PATH for this session
export PATH="$INSTALL_DIR/bin:$PATH"
export PGDATA="$DATA_DIR"
export PGPORT=$PORT

echo ""
echo -e "${GREEN}✅ PostgreSQL installed successfully!${NC}"
echo ""
echo -e "${BLUE}Installation Details:${NC}"
echo "Version: PostgreSQL $PG_VERSION"
echo "Install Directory: $INSTALL_DIR"
echo "Data Directory: $DATA_DIR"
echo "Port: $PORT"
echo "User: postgres (no password)"
echo ""
echo -e "${BLUE}Quick Commands:${NC}"
echo "Start:    ${GREEN}pg-start${NC}"
echo "Stop:     ${GREEN}pg-stop${NC}"
echo "Status:   ${GREEN}pg-status${NC}"
echo "Restart:  ${GREEN}pg-restart${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Reload shell:     ${YELLOW}source ~/.bashrc${NC}"
echo "2. Start PostgreSQL: ${YELLOW}pg-start${NC}"
echo "3. Setup database:   ${YELLOW}./scripts/setup-postgres-local.sh${NC}"
echo "4. Import data:      ${YELLOW}./scripts/import-latest-lawley.sh${NC}"
echo ""
echo -e "${BLUE}Test Connection:${NC}"
echo "${YELLOW}psql -p $PORT -U postgres -d postgres -c 'SELECT version()'${NC}"