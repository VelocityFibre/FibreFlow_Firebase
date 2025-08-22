# Playwright MCP Setup Guide for FibreFlow

## Installation Steps

### 1. Install Playwright MCP Globally
```bash
npm install -g @playwright/test playwright
```

### 2. Install Playwright MCP Server
```bash
npx @claude-ai/create-mcp-server@latest playwright
```

### 3. Configure Claude Desktop

Add to your Claude Desktop configuration file:

**Linux**: `~/.config/Claude/claude_config.json`
**Mac**: `~/Library/Application Support/Claude/claude_config.json`
**Windows**: `%APPDATA%\Claude\claude_config.json`

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/path/to/playwright-mcp/index.js"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "0"
      },
      "config": {
        "browser": "chromium",
        "headless": false,
        "viewport": {
          "width": 360,
          "height": 640
        },
        "deviceScaleFactor": 2,
        "isMobile": true,
        "hasTouch": true,
        "defaultTimeout": 30000
      }
    }
  }
}
```

### 4. Verify Installation

1. Restart Claude Desktop
2. Type `/mcp` in Claude - you should see "playwright" listed
3. Test with: `/screenshot-mobile` command

## Mobile-First Configuration

For PolePlantingApp development, we use mobile-first settings:

```json
"viewport": {
  "width": 360,    // Standard mobile width
  "height": 640    // Comfortable mobile height
},
"isMobile": true,   // Enable mobile emulation
"hasTouch": true    // Enable touch events
```

## Available Viewports

Common mobile viewports for testing:

- **iPhone SE**: 375x667
- **iPhone 12**: 390x844  
- **Pixel 5**: 393x851
- **Galaxy S20**: 360x800
- **iPad Mini**: 744x1133

## Network Conditions

Simulate field conditions:

```json
"networkConditions": {
  "offline": false,
  "downloadThroughput": 1600000,  // 3G speed
  "uploadThroughput": 750000,     // 3G speed
  "latency": 300                   // 3G latency
}
```

## Troubleshooting

### Issue: Playwright MCP not showing up
- Check Claude config file syntax (valid JSON)
- Restart Claude Desktop completely
- Check browser installation: `npx playwright install`

### Issue: Screenshots not working
- Ensure headless is set to `false` for debugging
- Check viewport settings are valid
- Verify browser permissions

### Issue: Touch events not registering
- Ensure `hasTouch: true` in config
- Use `tap()` instead of `click()` in tests
- Check mobile emulation is enabled

## Quick Test

After setup, test with:

```
/screenshot-mobile

This should:
1. Open PolePlantingApp in mobile viewport
2. Take a screenshot
3. Analyze for mobile issues
```

## Next Steps

1. Use `@agent poleplanting-mobile-reviewer` for comprehensive reviews
2. Use `@agent field-workflow-tester` for workflow validation
3. Create custom commands in `.claude/commands/` as needed
4. Add more agents in `.claude/agents/` for specific tests

## Resources

- [Playwright Docs](https://playwright.dev)
- [MCP Protocol](https://github.com/modelcontextprotocol)
- [Claude Desktop Docs](https://claude.ai/docs)