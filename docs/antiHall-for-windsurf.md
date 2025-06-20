# 🛡️ antiHall for Windsurf - Stop AI From Making Up Code

## For Hien: Simple Guide to Prevent AI Code Hallucinations

### 🎯 What is This?

**antiHall** is a tool that stops AI from suggesting fake functions that don't exist in your app. Think of it as "spell check for AI code suggestions."

### 🤔 The Problem

When Windsurf AI helps you code, it sometimes suggests functions like:
```javascript
userService.deleteAllUsersForever()  // ❌ This function doesn't exist!
```

But your app only has:
```javascript
userService.deleteUser()  // ✅ This is real
```

### 💡 The Solution: antiHall

A simple tool that:
1. Scans your codebase 
2. Lists all real functions
3. Checks if AI suggestions are real or fake

## 🚀 5-Minute Setup for Windsurf

### Step 1: Create the Checker

In your project root, create folder `ai-validator/`

### Step 2: Create `scan-code.js`

```javascript
const fs = require('fs');
const path = require('path');

// Configuration - adjust for your project
const CONFIG = {
  // Where your source code is
  sourceFolder: './src',
  
  // File extensions to check
  extensions: ['.js', '.ts', '.jsx', '.tsx'],
  
  // Folders to skip
  ignoreFolders: ['node_modules', '.git', 'dist', 'build']
};

// Find all functions in your codebase
function scanCodebase(dir, functions = {}) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    // Skip ignored folders
    if (stat.isDirectory()) {
      if (!CONFIG.ignoreFolders.includes(file)) {
        scanCodebase(fullPath, functions);
      }
      return;
    }
    
    // Check only source files
    const ext = path.extname(file);
    if (!CONFIG.extensions.includes(ext)) return;
    
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Find service/class names and their methods
    // Pattern 1: ES6 classes
    const classRegex = /class\s+(\w+Service|\w+Controller|\w+Model)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      functions[className] = functions[className] || [];
      
      // Find methods in this class
      const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
      let methodMatch;
      
      while ((methodMatch = methodRegex.exec(content)) !== null) {
        const methodName = methodMatch[1];
        // Skip constructor and common methods
        if (!['constructor', 'render', 'componentDidMount'].includes(methodName)) {
          if (!functions[className].includes(methodName)) {
            functions[className].push(methodName);
          }
        }
      }
    }
    
    // Pattern 2: Exported functions
    const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      functions.exports = functions.exports || [];
      if (!functions.exports.includes(match[1])) {
        functions.exports.push(match[1]);
      }
    }
  });
  
  return functions;
}

// Run the scan
console.log('🔍 Scanning your codebase...');
const functions = scanCodebase(CONFIG.sourceFolder);

// Save results
const output = {
  scannedAt: new Date().toISOString(),
  projectPath: process.cwd(),
  functions: functions,
  stats: {
    totalServices: Object.keys(functions).length,
    totalMethods: Object.values(functions).reduce((sum, methods) => sum + methods.length, 0)
  }
};

fs.writeFileSync('my-functions.json', JSON.stringify(output, null, 2));

console.log(`✅ Scan complete!`);
console.log(`📊 Found ${output.stats.totalServices} services with ${output.stats.totalMethods} methods`);
console.log(`💾 Saved to: my-functions.json`);
```

### Step 3: Create `check-ai.js`

```javascript
const fs = require('fs');

// Load your function list
const data = JSON.parse(fs.readFileSync('my-functions.json', 'utf8'));
const functions = data.functions;

// Get the AI code to check
const aiCode = process.argv[2];

if (!aiCode) {
  console.log(`
Usage: node check-ai.js "your.ai.suggested.code()"

Example:
  node check-ai.js "userService.deleteAllUsers()"
  `);
  process.exit(1);
}

console.log('🔍 Checking:', aiCode);

// Extract service and method from AI code
const match = aiCode.match(/(\w+)\.(\w+)\(/);

if (!match) {
  console.log('ℹ️ Could not parse code. Make sure format is: service.method()');
  process.exit(1);
}

const [_, serviceName, methodName] = match;

// Check if service exists
if (!functions[serviceName]) {
  console.log(`❌ Service '${serviceName}' not found!`);
  console.log(`\n💡 Available services:`);
  Object.keys(functions).slice(0, 5).forEach(s => {
    console.log(`  - ${s}`);
  });
  process.exit(1);
}

// Check if method exists
if (!functions[serviceName].includes(methodName)) {
  console.log(`❌ Method '${methodName}' does not exist on ${serviceName}!`);
  console.log(`\n💡 Available methods for ${serviceName}:`);
  functions[serviceName].forEach(m => {
    console.log(`  - ${m}()`);
  });
  process.exit(1);
}

// All good!
console.log(`✅ Valid! ${serviceName}.${methodName}() exists in your codebase.`);
```

### Step 4: Create `package.json`

```json
{
  "name": "ai-validator",
  "version": "1.0.0",
  "scripts": {
    "scan": "node scan-code.js",
    "check": "node check-ai.js"
  }
}
```

## 📖 How to Use It

### First Time Setup (One Time Only)
```bash
cd ai-validator
npm run scan
```

### Daily Usage
Whenever Windsurf AI suggests code:

```bash
# Copy the AI suggestion and check it
npm run check "userService.deleteAllUsers()"

# Result will be either:
# ✅ Valid! userService.deleteUser() exists
# OR
# ❌ Method 'deleteAllUsers' does not exist!
#    Available methods: deleteUser(), updateUser(), getUser()
```

### When to Re-Scan
Run `npm run scan` again when you:
- Add new services or controllers
- Add new methods to existing services
- Do major refactoring

## 🎨 Windsurf Integration

### Option 1: Terminal
Keep a terminal open and run checks manually

### Option 2: Windsurf Task
Add to `.vscode/tasks.json`:
```json
{
  "label": "Check AI Code",
  "type": "shell",
  "command": "cd ai-validator && npm run check \"${selectedText}\"",
  "presentation": {
    "reveal": "always",
    "panel": "shared"
  }
}
```

### Option 3: Ask AI to Check
When Windsurf suggests code, say:
"Please verify this method exists in my codebase before I use it"

## 🎯 Real Example

**AI Suggests:**
```javascript
// "Let me help you delete all products at once"
productService.deleteAllProducts();
```

**You Check:**
```bash
npm run check "productService.deleteAllProducts()"
# ❌ Method 'deleteAllProducts' does not exist!
#    Available methods: deleteProduct(), updateProduct(), getProducts()
```

**You Know:** AI made it up! Use `deleteProduct()` in a loop instead.

## 💡 Why This Helps

1. **Saves Time**: No more debugging fake functions
2. **Prevents Errors**: Catch mistakes before running code
3. **Learn Your Codebase**: See what methods actually exist
4. **Trust AI More**: Know when it's right or wrong

## 🚀 Pro Tips

1. **Check Before Implementing**: Always verify new AI suggestions
2. **Batch Check**: Check multiple methods at once
3. **Keep Updated**: Re-scan weekly or after big changes
4. **Share with Team**: Everyone benefits from this

---

**Remember**: AI is helpful but not perfect. antiHall makes it trustworthy! 🛡️

*Questions? The tool is simple - if it finds your functions, it's working!*