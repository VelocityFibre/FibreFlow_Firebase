#!/bin/bash

# Install PostgreSQL using pre-built binaries (no compilation needed)
# Much faster than building from source!

set -e

# Configuration
PG_VERSION="15.4"
ARCH="linux-x64"  # For 64-bit Linux
INSTALL_DIR="$HOME/postgresql"
DATA_DIR="$HOME/postgresql_data"
PORT=5433  # Non-standard port to avoid conflicts

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== PostgreSQL Binary Installation (No sudo needed) ===${NC}"
echo ""
echo "This installs pre-built PostgreSQL binaries - much faster!"
echo "Version: PostgreSQL $PG_VERSION"
echo "Install to: $INSTALL_DIR"
echo "Data directory: $DATA_DIR"
echo "Port: $PORT (to avoid conflicts)"
echo ""

# Check if already installed
if [ -d "$INSTALL_DIR/bin" ] && [ -f "$INSTALL_DIR/bin/postgres" ]; then
    echo -e "${YELLOW}PostgreSQL already installed at $INSTALL_DIR${NC}"
    echo "Remove it first with: rm -rf $INSTALL_DIR $DATA_DIR"
    exit 1
fi

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$HOME/.local/bin"

# Download pre-built binaries from EDB
echo -e "${YELLOW}Downloading PostgreSQL binaries...${NC}"
cd /tmp
BINARY_URL="https://sbp.enterprisedb.com/getfile.jsp?fileid=1258649"
wget -O "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" \
    "https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-1-linux-x64-binaries.tar.gz" \
    || wget -O "postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" "$BINARY_URL"

# Extract to install directory
echo -e "${YELLOW}Extracting binaries...${NC}"
cd "$INSTALL_DIR"
tar -xzf "/tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz" --strip-components=1

# Initialize database cluster
echo -e "${YELLOW}Initializing database...${NC}"
"$INSTALL_DIR/bin/initdb" -D "$DATA_DIR" -U postgres

# Configure PostgreSQL
echo -e "${YELLOW}Configuring PostgreSQL...${NC}"
cat >> "$DATA_DIR/postgresql.conf" << EOF

# Custom configuration
port = $PORT
listen_addresses = 'localhost'
max_connections = 50
shared_buffers = 128MB
EOF

# Create helper scripts
echo -e "${YELLOW}Creating helper scripts...${NC}"

# Start script
cat > "$HOME/.local/bin/pg-start" << EOF
#!/bin/bash
echo "Starting PostgreSQL on port $PORT..."
"$INSTALL_DIR/bin/pg_ctl" -D "$DATA_DIR" -l "$DATA_DIR/postgresql.log" start
echo "PostgreSQL started. Check log: $DATA_DIR/postgresql.log"
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

# Make scripts executable
chmod +x "$HOME/.local/bin/pg-start"
chmod +x "$HOME/.local/bin/pg-stop"
chmod +x "$HOME/.local/bin/pg-status"

# Update PATH in bashrc
if ! grep -q "$INSTALL_DIR/bin" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# PostgreSQL local installation" >> ~/.bashrc
    echo "export PATH=\"$INSTALL_DIR/bin:\$PATH\"" >> ~/.bashrc
    echo "export PGDATA=\"$DATA_DIR\"" >> ~/.bashrc
    echo "export PGPORT=$PORT" >> ~/.bashrc
fi

# Clean up
rm -f "/tmp/postgresql-${PG_VERSION}-linux-x64-binaries.tar.gz"

# Update our config
echo -e "${YELLOW}Updating database configuration...${NC}"
cat > config/postgres-connection.json << EOF
{
  "development": {
    "host": "localhost",
    "port": $PORT,
    "database": "fibreflow_staging",
    "user": "postgres",
    "password": "postgres"
  }
}
EOF

# Source the new PATH
export PATH="$INSTALL_DIR/bin:$PATH"
export PGDATA="$DATA_DIR"
export PGPORT=$PORT

echo ""
echo -e "${GREEN}✅ PostgreSQL installed successfully!${NC}"
echo ""
echo -e "${BLUE}Quick Start Commands:${NC}"
echo "1. Start PostgreSQL:  ${GREEN}pg-start${NC}"
echo "2. Stop PostgreSQL:   ${GREEN}pg-stop${NC}"
echo "3. Check status:      ${GREEN}pg-status${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Reload your shell: ${YELLOW}source ~/.bashrc${NC}"
echo "2. Start PostgreSQL:  ${YELLOW}pg-start${NC}"
echo "3. Run setup script:  ${YELLOW}./scripts/setup-postgres-local.sh${NC}"
echo ""
echo -e "${BLUE}Connection Details:${NC}"
echo "Host: localhost"
echo "Port: $PORT"
echo "User: postgres"
echo "Database: (will create fibreflow_staging)"