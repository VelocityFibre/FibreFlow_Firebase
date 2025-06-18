# Node.js Version Management Best Practices

## Overview
This document outlines best practices for managing Node.js versions in development environments to avoid version conflicts and hardcoded path issues.

## Common Problems and Solutions

### 1. Hardcoded Version Paths
**Problem**: Scripts and aliases that hardcode specific Node version paths break when versions change.

**Bad Example**:
```bash
# ❌ WRONG - Hardcoded path
alias claude="/home/ldp/.nvm/versions/node/v18.20.7/bin/claude"
node /home/ldp/.nvm/versions/node/v18.20.7/lib/node_modules/@tool/cli.js
```

**Good Example**:
```bash
# ✅ CORRECT - Dynamic path resolution
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Find tool dynamically
TOOL_PATH=$(find "$HOME/.nvm/versions/node" -name "cli.js" -path "*/@tool/*" | head -1)
node "$TOOL_PATH"
```

### 2. Version Persistence Issues
**Problem**: System reverts to old Node version despite setting a new default.

**Solution**:
```bash
# Set default version
nvm alias default 20.19.2

# Ensure it persists in new shells
echo 'nvm use default' >> ~/.bashrc
```

### 3. Script Compatibility
**Problem**: Scripts fail because nvm is not loaded.

**Solution**: Always load nvm in scripts:
```bash
#!/bin/bash
# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Now safe to use node/npm
npm run build
```

## Best Practices

### 1. Dynamic Path Resolution
```bash
# Find executables dynamically
NODE_BIN=$(which node)
NPM_BIN=$(which npm)

# Find module paths dynamically
MODULE_PATH=$(npm root -g)
```

### 2. Version Checking
```bash
# Check minimum version requirements
REQUIRED_NODE="20.19"
CURRENT_NODE=$(node -v | cut -d'v' -f2)

if [ "$(printf '%s\n' "$REQUIRED_NODE" "$CURRENT_NODE" | sort -V | head -n1)" != "$REQUIRED_NODE" ]; then
    echo "Node.js $REQUIRED_NODE or higher required"
    exit 1
fi
```

### 3. Graceful Fallbacks
```bash
# Try multiple methods to find a tool
find_tool() {
    # Method 1: Check if in PATH
    if command -v tool-name &> /dev/null; then
        echo "tool-name"
        return 0
    fi
    
    # Method 2: Search in node_modules
    local tool=$(find "$HOME/.nvm" -name "tool-name" -type f -executable 2>/dev/null | head -1)
    if [ -n "$tool" ]; then
        echo "$tool"
        return 0
    fi
    
    # Method 3: Fail gracefully
    echo "Error: tool-name not found" >&2
    return 1
}
```

### 4. Project-Specific Versions
Use `.nvmrc` file in project root:
```bash
# Create .nvmrc
echo "20.19.2" > .nvmrc

# Auto-use when entering directory
# Add to ~/.bashrc:
cd() {
    builtin cd "$@"
    if [ -f .nvmrc ]; then
        nvm use
    fi
}
```

## Debugging Version Issues

### Check Current Setup
```bash
# Current node version
node --version

# Which node is being used
which node

# NVM's default
nvm alias default

# All installed versions
nvm list

# Environment paths
echo $PATH | tr ':' '\n' | grep node
```

### Fix Common Issues
```bash
# Remove old Node from PATH
export PATH=$(echo $PATH | sed 's|/old/node/path:||g')

# Reinstall global packages for new version
nvm use 20.19.2
npm install -g @angular/cli@latest

# Clear npm cache if needed
npm cache clean --force
```

## Angular-Specific Considerations

### Version Requirements
- Angular 20 requires Node.js v20.19 or v22.12 minimum
- Always check `package.json` engines field

### Global vs Local Angular CLI
```bash
# Use local version (recommended)
npx ng build

# Or ensure global matches project
npm install -g @angular/cli@$(npm list @angular/cli --json | jq -r '.dependencies["@angular/cli"].version')
```

## Summary
1. **Never hardcode Node version paths**
2. **Always use dynamic path resolution**
3. **Load nvm in all scripts**
4. **Set and verify default versions**
5. **Use .nvmrc for project consistency**
6. **Test scripts with different Node versions**

Remember: The goal is to make your development environment resilient to version changes while maintaining compatibility with project requirements.