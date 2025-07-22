# Zep MCP Setup for FibreFlow

## Option 1: Zep Cloud (Simplest)

### 1. Sign up for Zep Cloud
Go to https://app.getzep.com and create an account.

### 2. Get your API Key
Once logged in, go to Settings → API Keys and create a new key.

### 3. Install Zep SDK
```bash
npm install --save @getzep/zep-cloud
```

### 4. Create a Zep Integration Script
Since there's no direct MCP server for Zep Cloud, we'll create a bridge script that Claude can use:

```javascript
// .claude/zep-bridge.js
const { ZepClient } = require('@getzep/zep-cloud');

const zep = new ZepClient({
  apiKey: process.env.ZEP_API_KEY || 'YOUR_API_KEY'
});

// Use this script to interact with Zep
async function main() {
  const command = process.argv[2];
  
  switch(command) {
    case 'add-session':
      // Add a development session
      const sessionId = `fibreflow_${Date.now()}`;
      await zep.memory.add({
        session_id: sessionId,
        messages: [{
          role: 'system',
          content: process.argv[3],
          metadata: { timestamp: new Date().toISOString() }
        }]
      });
      console.log(`Added to session ${sessionId}`);
      break;
      
    case 'search':
      // Search memories
      const results = await zep.search({
        text: process.argv[3],
        limit: 10
      });
      console.log(JSON.stringify(results, null, 2));
      break;
  }
}

main().catch(console.error);
```

### 5. Use from Claude
```bash
# Add a memory
node .claude/zep-bridge.js add-session "Learned that Firebase projects are separate"

# Search memories
node .claude/zep-bridge.js search "firebase authentication"
```

## Option 2: Graphiti MCP Server (What we started)

The Graphiti MCP server requires:
1. Neo4j or FalkorDB database
2. Python environment with uv
3. OpenAI API key

This is more complex but gives you full control over your data.

## Recommendation

For immediate use, I recommend:
1. Sign up for Zep Cloud (free tier available)
2. Use the bridge script above
3. Later, if needed, set up the full Graphiti MCP server

Would you like me to:
1. Help you sign up for Zep Cloud and create the bridge script?
2. Continue with the Graphiti setup (requires a database)?
3. Create a hybrid solution using our existing local memory system + Zep Cloud for advanced features?