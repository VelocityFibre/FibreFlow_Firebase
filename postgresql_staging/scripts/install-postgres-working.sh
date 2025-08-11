#!/bin/bash

# PostgreSQL installation using available binaries from EDB
# Using PostgreSQL 10.23 (has Linux x86-64 binaries available)

set -e

# Configuration
PG_VERSION="10.23"
INSTALL_DIR="$HOME/postgresql"
DATA_DIR="$HOME/postgresql_data"
PORT=5433

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== PostgreSQL Installation (Working Version) ===${NC}"
echo ""
echo "Installing PostgreSQL $PG_VERSION (has confirmed Linux x86-64 binaries)"
echo "This version will work perfectly for our staging needs!"
echo ""

# Clean up any previous attempts
rm -rf /tmp/postgresql-*.tar.gz 2>/dev/null || true

# Create directories
mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$HOME/.local/bin"

echo -e "${YELLOW}Downloading PostgreSQL $PG_VERSION binaries...${NC}"

# Download PostgreSQL 10.23 Linux x86-64 binaries
# From the page you showed, this link exists and works
cd /tmp
if wget -q --show-progress -O "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" \
    "https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-1-linux-x64-binaries.tar.gz"; then
    
    echo -e "${GREEN}✓ Download completed${NC}"
    
else
    echo -e "${RED}Download failed. Trying alternative approach...${NC}"
    
    # Alternative: try curl
    if curl -L -o "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" \
        "https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-1-linux-x64-binaries.tar.gz"; then
        echo -e "${GREEN}✓ Downloaded with curl${NC}"
    else
        echo -e "${RED}Both wget and curl failed${NC}"
        echo ""
        echo "Manual download needed:"
        echo "1. Go to: https://www.enterprisedb.com/download-postgresql-binaries"
        echo "2. Find 'Version 10.23' section"
        echo "3. Click 'Linux x86-64' link"
        echo "4. Save as: /tmp/postgresql-10.23-linux-x64-binaries.tar.gz"
        echo "5. Re-run this script"
        exit 1
    fi
fi

# Verify download
echo -e "${YELLOW}Verifying download...${NC}"
if [ ! -f "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" ]; then
    echo -e "${RED}Downloaded file not found!${NC}"
    exit 1
fi

# Check if it's a valid gzip file
if ! file "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" | grep -q "gzip compressed"; then
    echo -e "${RED}Downloaded file is not a valid gzip archive${NC}"
    echo "File type: $(file postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz)"
    echo ""
    echo "This might be an HTML error page. Please download manually."
    exit 1
fi

echo -e "${GREEN}✓ Download verified${NC}"

# Extract
echo -e "${YELLOW}Extracting PostgreSQL...${NC}"
cd "$INSTALL_DIR"
if tar -xzf "/tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" --strip-components=1; then
    echo -e "${GREEN}✓ Extraction successful${NC}"
else
    echo -e "${RED}Extraction failed${NC}"
    exit 1
fi

# Initialize database
echo -e "${YELLOW}Initializing database cluster...${NC}"
"$INSTALL_DIR/bin/initdb" -D "$DATA_DIR" -U postgres --auth-local=trust --auth-host=trust

# Configure PostgreSQL
echo -e "${YELLOW}Configuring PostgreSQL...${NC}"
cat >> "$DATA_DIR/postgresql.conf" << EOF

# Custom configuration for local development
port = $PORT
listen_addresses = 'localhost'
max_connections = 50
shared_buffers = 128MB
log_min_messages = warning
timezone = 'UTC'
EOF

# Set up authentication (trust for local development)
cat > "$DATA_DIR/pg_hba.conf" << EOF
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF

# Create convenience scripts
echo -e "${YELLOW}Creating management scripts...${NC}"

# Start PostgreSQL
cat > "$HOME/.local/bin/pg-start" << EOF
#!/bin/bash
echo "🚀 Starting PostgreSQL $PG_VERSION on port $PORT..."
if "\$HOME/postgresql/bin/pg_ctl" -D "\$HOME/postgresql_data" -l "\$HOME/postgresql_data/postgresql.log" start; then
    echo "✅ PostgreSQL started successfully!"
    echo "📊 Status: \$(pg-status)"
    echo "📋 Log file: \$HOME/postgresql_data/postgresql.log"
    echo ""
    echo "🔧 Quick commands:"
    echo "  Connect: psql -p $PORT -U postgres"
    echo "  Stop:    pg-stop"
    echo "  Status:  pg-status"
else
    echo "❌ Failed to start PostgreSQL"
    echo "Check log: \$HOME/postgresql_data/postgresql.log"
    exit 1
fi
EOF

# Stop PostgreSQL
cat > "$HOME/.local/bin/pg-stop" << EOF
#!/bin/bash
echo "🛑 Stopping PostgreSQL..."
"\$HOME/postgresql/bin/pg_ctl" -D "\$HOME/postgresql_data" stop
echo "✅ PostgreSQL stopped"
EOF

# Status check
cat > "$HOME/.local/bin/pg-status" << EOF
#!/bin/bash
"\$HOME/postgresql/bin/pg_ctl" -D "\$HOME/postgresql_data" status
EOF

# Restart
cat > "$HOME/.local/bin/pg-restart" << EOF
#!/bin/bash
echo "🔄 Restarting PostgreSQL..."
pg-stop && sleep 2 && pg-start
EOF

# Make scripts executable
chmod +x "$HOME/.local/bin/pg-"*

# Update bashrc for PATH
if ! grep -q "$INSTALL_DIR/bin" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# PostgreSQL local installation" >> ~/.bashrc
    echo "export PATH=\"$INSTALL_DIR/bin:\$PATH\"" >> ~/.bashrc
    echo "export PGDATA=\"$DATA_DIR\"" >> ~/.bashrc
    echo "export PGPORT=$PORT" >> ~/.bashrc
fi

# Update our database configuration
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

# Clean up download
rm -f "/tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz"

# Set environment for current session
export PATH="$INSTALL_DIR/bin:$PATH"
export PGDATA="$DATA_DIR"
export PGPORT=$PORT

echo ""
echo -e "${GREEN}🎉 PostgreSQL $PG_VERSION installed successfully!${NC}"
echo ""
echo -e "${BLUE}📁 Installation Details:${NC}"
echo "  📂 Install Directory: $INSTALL_DIR"
echo "  📂 Data Directory: $DATA_DIR"
echo "  🔌 Port: $PORT"
echo "  👤 User: postgres (no password required)"
echo ""
echo -e "${BLUE}⚡ Quick Commands:${NC}"
echo "  🚀 Start:    ${GREEN}pg-start${NC}"
echo "  🛑 Stop:     ${GREEN}pg-stop${NC}"
echo "  📊 Status:   ${GREEN}pg-status${NC}"
echo "  🔄 Restart:  ${GREEN}pg-restart${NC}"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "  1. Reload your shell:    ${YELLOW}source ~/.bashrc${NC}"
echo "  2. Start PostgreSQL:     ${YELLOW}pg-start${NC}"
echo "  3. Setup database:       ${YELLOW}./scripts/setup-postgres-local.sh${NC}"
echo "  4. Import your data:     ${YELLOW}./scripts/import-latest-lawley.sh${NC}"
echo ""
echo -e "${BLUE}🧪 Test Connection:${NC}"
echo "  ${YELLOW}psql -p $PORT -U postgres -c 'SELECT version()'${NC}"
echo ""
echo -e "${GREEN}✨ Ready for your Excel imports!${NC}"