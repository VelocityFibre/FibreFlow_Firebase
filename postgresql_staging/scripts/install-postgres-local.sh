#!/bin/bash

# Install PostgreSQL locally without sudo
# This creates a completely user-space PostgreSQL installation

set -e

# Configuration
PG_VERSION="15.4"
INSTALL_DIR="$HOME/postgresql"
DATA_DIR="$HOME/postgresql_data"
PORT=5433  # Use non-standard port to avoid conflicts

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== Local PostgreSQL Installation (No sudo required) ===${NC}"
echo ""
echo "This will install PostgreSQL $PG_VERSION in your home directory"
echo "Installation directory: $INSTALL_DIR"
echo "Data directory: $DATA_DIR"
echo "Port: $PORT"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"
cd "$INSTALL_DIR"

# Download PostgreSQL source
echo -e "${YELLOW}Downloading PostgreSQL source...${NC}"
wget -q --show-progress "https://ftp.postgresql.org/pub/source/v${PG_VERSION}/postgresql-${PG_VERSION}.tar.gz"

# Extract
echo -e "${YELLOW}Extracting...${NC}"
tar -xzf "postgresql-${PG_VERSION}.tar.gz"
cd "postgresql-${PG_VERSION}"

# Configure without system dependencies
echo -e "${YELLOW}Configuring...${NC}"
./configure --prefix="$INSTALL_DIR" --without-readline --without-zlib

# Compile (this will take a while)
echo -e "${YELLOW}Compiling (this will take 5-10 minutes)...${NC}"
make -j$(nproc)

# Install to local directory
echo -e "${YELLOW}Installing...${NC}"
make install

# Add to PATH
echo "" >> ~/.bashrc
echo "# PostgreSQL local installation" >> ~/.bashrc
echo "export PATH=\"$INSTALL_DIR/bin:\$PATH\"" >> ~/.bashrc
echo "export PGDATA=\"$DATA_DIR\"" >> ~/.bashrc
echo "export PGPORT=$PORT" >> ~/.bashrc

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"
"$INSTALL_DIR/bin/initdb" -D "$DATA_DIR"

# Update postgresql.conf for our port
sed -i "s/#port = 5432/port = $PORT/" "$DATA_DIR/postgresql.conf"

# Create start/stop scripts
cat > "$INSTALL_DIR/start-postgres.sh" << EOF
#!/bin/bash
$INSTALL_DIR/bin/pg_ctl -D $DATA_DIR -l $DATA_DIR/logfile start
EOF

cat > "$INSTALL_DIR/stop-postgres.sh" << EOF
#!/bin/bash
$INSTALL_DIR/bin/pg_ctl -D $DATA_DIR stop
EOF

chmod +x "$INSTALL_DIR/start-postgres.sh"
chmod +x "$INSTALL_DIR/stop-postgres.sh"

# Clean up
cd "$INSTALL_DIR"
rm -f "postgresql-${PG_VERSION}.tar.gz"

echo ""
echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo ""
echo "To use PostgreSQL:"
echo "1. Reload your shell: source ~/.bashrc"
echo "2. Start PostgreSQL: $INSTALL_DIR/start-postgres.sh"
echo "3. Create database: createdb fibreflow_staging"
echo "4. Connect: psql -p $PORT fibreflow_staging"
echo ""
echo "Next steps:"
echo "- Update config/database.json to use port $PORT"
echo "- Run setup script with local PostgreSQL"