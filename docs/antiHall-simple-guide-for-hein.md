# 🛡️ Stop AI From Making Up Fake Code - Simple Guide for Hein

## The Problem (1 minute read)

When AI helps you code, it sometimes invents functions that don't exist:

```javascript
// AI suggests this:
userService.deleteAllUsersForever()  // ❌ FAKE!

// But your app only has:
userService.deleteUser()  // ✅ Real function
```

This wastes hours debugging code that can never work.

## The Solution: antiHall

A tool that:
1. **Scans** your entire codebase
2. **Lists** all real functions that exist
3. **Checks** if AI suggestions are real or fake

Think of it as "spell check" but for AI code suggestions.

## For Windsurf/Cursor Users (Easy Setup)

Instead of building it yourself, just ask your AI assistant to build it for you!

### Step 1: Create the Tool

Copy this entire prompt to Windsurf/Cursor:

```
Create a comprehensive "antiHall" tool that prevents AI code hallucinations by validating code against my actual codebase.

Requirements:
1. Create a folder called 'antiHall' in my project root
2. Use TypeScript AST parsing (@typescript-eslint/parser) for 100% accuracy
3. Support .js, .ts, .jsx, .tsx files

The tool must detect and validate:
- Service/API classes and ALL their methods (including arrow functions)
- Component classes and their methods/lifecycle hooks
- React hooks and custom hooks
- Exported functions and constants
- Object methods and properties
- Class properties with arrow functions
- Method parameters and types (if TypeScript)
- RxJS operators (if used)
- Import paths and modules

Create a knowledge graph structure like:
{
  "services": {
    "UserService": {
      "methods": ["getUser", "updateUser", "deleteUser"],
      "properties": ["currentUser", "userCache"]
    }
  },
  "components": {
    "UserList": {
      "methods": ["loadUsers", "handleDelete"],
      "hooks": ["useEffect", "useState"]
    }
  },
  "functions": ["validateEmail", "formatDate"],
  "validImports": ["@angular/core", "react", "./utils"]
}

Files needed:
- scan.js: Builds complete knowledge graph using AST parsing
- check.js: Validates any code pattern (not just method calls)
- package.json with scripts: "scan" and "check"

The checker should validate:
- Method existence: userService.deleteAllUsers()
- Property access: userService.isLoggedIn
- Imports: import { Something } from './somewhere'
- React hooks: useCustomHook()
- Component usage: <UserList />

Make it work with:
npm run scan - Builds knowledge graph
npm run check "any.code.to.validate()"

CRITICAL: Use proper AST parsing for 100% accuracy. Parse the actual TypeScript/JavaScript AST tree, don't use regex patterns.
```

### Step 2: Let AI Build It

The AI will create the complete tool for you. It should generate:
- Proper AST-based parser
- All necessary files
- Clear instructions

### Step 3: Use It Daily

```bash
# First time only
cd antiHall
npm install
npm run scan

# Daily usage - check AI suggestions
npm run check "userService.deleteAllUsers()"
# Result: ❌ Fake! Did you mean: deleteUser()?
```

## Why This Works

- **No manual coding** - AI builds it for you
- **100% accurate** - Uses proper code parsing
- **Simple to use** - Just two commands
- **Saves hours** - Catch fake functions instantly

## Pro Tip

Add this to your daily workflow:
1. AI suggests code
2. Copy the method call
3. Run `npm run check`
4. Only implement if it's real!

---

**That's it!** Let the AI build the tool, then use it to check the AI's own suggestions. Pretty clever, right? 😊