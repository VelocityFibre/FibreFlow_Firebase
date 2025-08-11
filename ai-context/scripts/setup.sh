#!/bin/bash

# Vertex AI Context Manager - Setup Script
# This script sets up the development environment for the Vertex AI Context Manager

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_ID="fibreflow-73daf"
LOCATION="us-central1"
FIBREFLOW_ROOT="/home/ldp/VF/Apps/FibreFlow"

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Vertex AI Context Manager Setup${NC}"
echo -e "${BLUE}==================================${NC}"

# Step 1: Check Python version
echo -e "\n${YELLOW}Checking Python version...${NC}"
python_version=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
required_version="3.9"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then 
    echo -e "${GREEN}✓ Python $python_version is installed (>= $required_version required)${NC}"
else
    echo -e "${RED}✗ Python $python_version is too old. Please install Python >= $required_version${NC}"
    exit 1
fi

# Step 2: Check if gcloud is installed
echo -e "\n${YELLOW}Checking Google Cloud SDK...${NC}"
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✓ Google Cloud SDK is installed${NC}"
    gcloud version
else
    echo -e "${RED}✗ Google Cloud SDK is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Step 3: Check authentication
echo -e "\n${YELLOW}Checking Google Cloud authentication...${NC}"
if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${GREEN}✓ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')${NC}"
else
    echo -e "${YELLOW}! Not authenticated. Running 'gcloud auth login'...${NC}"
    gcloud auth login
fi

# Step 4: Set up project
echo -e "\n${YELLOW}Setting up Google Cloud project...${NC}"
current_project=$(gcloud config get-value project 2>/dev/null)
if [ "$current_project" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}! Setting project to $PROJECT_ID...${NC}"
    gcloud config set project $PROJECT_ID
else
    echo -e "${GREEN}✓ Project already set to $PROJECT_ID${NC}"
fi

# Step 5: Enable required APIs
echo -e "\n${YELLOW}Enabling required Google Cloud APIs...${NC}"
apis=(
    "aiplatform.googleapis.com"
    "compute.googleapis.com"
    "storage.googleapis.com"
)

for api in "${apis[@]}"; do
    echo -n "Enabling $api... "
    if gcloud services enable $api --quiet 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}(already enabled)${NC}"
    fi
done

# Step 6: Create Python virtual environment
echo -e "\n${YELLOW}Setting up Python environment...${NC}"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
source venv/bin/activate

# Step 7: Install Python dependencies
echo -e "\n${YELLOW}Installing Python dependencies...${NC}"
cat > requirements.txt << EOF
google-cloud-aiplatform>=1.38.0
google-cloud-storage>=2.10.0
python-dotenv>=1.0.0
click>=8.1.0
rich>=13.0.0
pyyaml>=6.0
pytest>=7.4.0
black>=23.0.0
pylint>=2.17.0
watchdog>=3.0.0
pyperclip>=1.8.0
EOF

pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 8: Create configuration files
echo -e "\n${YELLOW}Creating configuration files...${NC}"

# Create .env.local template
if [ ! -f "../.env.local" ]; then
    cat > ../.env.local << EOF
# Vertex AI Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
VERTEX_AI_LOCATION=$LOCATION
VERTEX_AI_MODEL=gemini-1.5-pro-preview-0409

# Optional: Service Account Key Path
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Cost Control
VERTEX_AI_DAILY_LIMIT=10.00
VERTEX_AI_CACHE_ENABLED=true
VERTEX_AI_CACHE_TTL=3600
EOF
    echo -e "${GREEN}✓ Created .env.local template${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# Create vertex config
cat > config/vertex_config.yaml << EOF
# Vertex AI Context Manager Configuration

project:
  id: $PROJECT_ID
  name: FibreFlow
  root: $FIBREFLOW_ROOT

vertex_ai:
  location: $LOCATION
  model: gemini-1.5-pro-preview-0409
  temperature: 0.3
  max_input_tokens: 1048576
  max_output_tokens: 8192

codebase:
  include_patterns:
    - "**/*.ts"
    - "**/*.html"
    - "**/*.scss"
    - "**/*.json"
    - "**/CLAUDE.md"
  exclude_patterns:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/.angular/**"
    - "**/coverage/**"
    - "**/*.spec.ts"

caching:
  enabled: true
  ttl: 3600
  max_size_mb: 100
  strategy: lru

patterns:
  enforce: true
  strict_mode: true
  auto_detect: true
  
monitoring:
  log_level: INFO
  track_costs: true
  alert_threshold: 10.00
  
cli:
  default_command: enhance
  history_size: 100
  output_format: markdown
EOF
echo -e "${GREEN}✓ Created vertex_config.yaml${NC}"

# Step 9: Create test script
echo -e "\n${YELLOW}Creating test connection script...${NC}"
cat > scripts/test_connection.py << 'EOF'
#!/usr/bin/env python3
"""Test Vertex AI connection"""

import os
import sys
from google.cloud import aiplatform
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env.local")

def test_vertex_connection():
    """Test basic Vertex AI connection"""
    try:
        # Initialize Vertex AI
        project = os.getenv("GOOGLE_CLOUD_PROJECT", "fibreflow-73daf")
        location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
        
        print(f"Initializing Vertex AI...")
        print(f"Project: {project}")
        print(f"Location: {location}")
        
        aiplatform.init(project=project, location=location)
        
        # Test with a simple prompt
        from vertexai.language_models import TextGenerationModel
        
        print("\nLoading model...")
        model = TextGenerationModel.from_pretrained("text-bison@002")
        
        print("Sending test prompt...")
        response = model.predict(
            "Say 'Vertex AI is connected!' if you can read this.",
            temperature=0.1,
            max_output_tokens=50,
        )
        
        print(f"\nResponse: {response.text}")
        print("\n✅ Vertex AI connection successful!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Connection failed: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check your Google Cloud authentication: gcloud auth list")
        print("2. Verify project ID in .env.local")
        print("3. Ensure Vertex AI API is enabled")
        return False

if __name__ == "__main__":
    sys.exit(0 if test_vertex_connection() else 1)
EOF
chmod +x scripts/test_connection.py
echo -e "${GREEN}✓ Created test connection script${NC}"

# Step 10: Test Vertex AI connection
echo -e "\n${YELLOW}Testing Vertex AI connection...${NC}"
if python scripts/test_connection.py; then
    echo -e "${GREEN}✓ Vertex AI connection test passed${NC}"
else
    echo -e "${RED}✗ Vertex AI connection test failed${NC}"
    echo "Please check the error message above and fix any issues"
    exit 1
fi

# Step 11: Create initial cache directories
echo -e "\n${YELLOW}Creating cache directories...${NC}"
mkdir -p cache logs
touch cache/.gitkeep logs/.gitkeep
echo -e "${GREEN}✓ Cache directories created${NC}"

# Step 12: Create .gitignore
echo -e "\n${YELLOW}Creating .gitignore...${NC}"
cat > .gitignore << EOF
# Python
venv/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/

# Cache and logs
cache/*
!cache/.gitkeep
logs/*
!logs/.gitkeep

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Test coverage
.coverage
htmlcov/
.pytest_cache/
EOF
echo -e "${GREEN}✓ Created .gitignore${NC}"

# Step 13: Final summary
echo -e "\n${BLUE}==================================${NC}"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo -e "${BLUE}==================================${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review and update ../.env.local with your settings"
echo "2. Run the codebase indexer: python scripts/index_codebase.py"
echo "3. Test the CLI: python cli/vertex_cli.py enhance 'test query'"

echo -e "\n${YELLOW}Useful commands:${NC}"
echo "- Activate environment: source venv/bin/activate"
echo "- Test connection: python scripts/test_connection.py"
echo "- Check costs: gcloud billing accounts list"

echo -e "\n${GREEN}Happy coding with Vertex AI Context Manager! 🚀${NC}"