# Snap Happy Screenshot Tool - Usage Guide

## Overview
Snap Happy is a Model Context Protocol (MCP) server that allows Claude to take and retrieve screenshots on your system. Screenshots are stored in this directory.

## Installation Details

### What We Installed
1. **Snap Happy MCP Server**
   - Repository: https://github.com/badlogic/lemmy/tree/main/apps/snap-happy
   - Location: `/home/ldp/VF/Apps/FibreFlow/tools/lemmy/apps/snap-happy`
   - Built from source using TypeScript/Node.js

2. **Linux Screenshot Tool**
   - Package: `scrot` (via `sudo pacman -S scrot`)
   - Required for screenshot capture on Linux systems

3. **Configuration Files**
   - Claude Desktop config: `~/.config/Claude/claude_desktop_config.json`
   - Environment variable: `SNAP_HAPPY_SCREENSHOT_PATH` in `~/.bashrc`

## Setup Status
✅ **Snap Happy**: Cloned and built from GitHub repository  
✅ **Dependencies**: Node.js packages installed via npm  
✅ **Screenshot Tool**: `scrot` installed for Linux screenshot capture  
✅ **Storage Path**: `/home/ldp/VF/Apps/FibreFlow/screenshots`  
✅ **MCP Integration**: Added to Claude Desktop configuration  

## How to Use

### Commands You Can Give Claude

1. **Take a Screenshot**
   - "Take a screenshot"
   - "Capture the screen"
   - "Screenshot the current window"
   - "Can you take a screenshot of what I'm seeing?"

2. **Retrieve Last Screenshot**
   - "Show me the last screenshot"
   - "Get the most recent screenshot"
   - "What's in the last screenshot I took?"
   - "Analyze the last screenshot"

3. **Visual Debugging**
   - "Take a screenshot and tell me what's wrong with the UI"
   - "Screenshot this error and help me fix it"
   - "Capture the current state of the app"
   - "Take a screenshot of the RFQ page"

### How It Works

1. **Screenshot Capture**
   - When you ask Claude to take a screenshot, it uses `scrot` on Linux
   - The screenshot is saved as a PNG file in this directory
   - Claude receives the image data as base64

2. **Screenshot Retrieval**
   - Claude can access the most recent screenshot taken
   - The image is analyzed using Claude's vision capabilities
   - You'll get descriptions and insights about what's visible

3. **Workflow Example**
   ```
   You: "The button styling looks wrong, can you take a screenshot?"
   Claude: [Takes screenshot] "I can see the button has incorrect padding..."
   
   You: "Take a screenshot of the error message"
   Claude: [Takes screenshot] "I see the error says 'undefined field value'..."
   ```

### Important Notes

- **Privacy**: Screenshots are stored locally in this directory
- **Permissions**: First use may require screen recording permissions
- **Full Screen**: On Linux, captures the entire screen (not individual windows)
- **File Format**: Screenshots are saved as PNG files with timestamps

### Troubleshooting

If screenshots aren't working:

1. **Check Claude Desktop is restarted** after configuration
2. **Verify scrot is installed**: `which scrot`
3. **Check this directory is writable**: `ls -la`
4. **Look for error messages** in Claude's response

### File Naming
Screenshots are saved with timestamps, e.g., `screenshot-2024-01-15-14-30-45.png`

### Manual Screenshots
You can also manually place screenshots in this directory and ask Claude to analyze them:
- "Look at screenshot-xyz.png and tell me what you see"
- "Analyze the latest PNG file in the screenshots folder"

## Benefits for Development

1. **Visual Bug Reports**: Show Claude exactly what's wrong
2. **UI Review**: Get feedback on layouts and designs  
3. **Error Documentation**: Capture error states for debugging
4. **Progress Tracking**: Document app states during development
5. **Responsive Testing**: Show Claude how the app looks at different sizes

## Example Use Cases

### Debugging
```
"Take a screenshot of the console errors"
"Screenshot the network tab in DevTools"
"Capture the current DOM inspector state"
```

### UI/UX Review
```
"Screenshot the dashboard and suggest improvements"
"Take a screenshot and check if the colors match our theme"
"Capture the mobile view and analyze the layout"
```

### Documentation
```
"Take screenshots of each step in the workflow"
"Screenshot the before and after states"
"Capture this for our documentation"
```

---

*Note: This tool requires Claude Desktop with MCP support. Web-based Claude cannot access local screenshots.*