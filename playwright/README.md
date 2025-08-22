# Playwright MCP Integration for FibreFlow

## Overview

This directory contains the Playwright MCP (Model Context Protocol) integration for FibreFlow, specifically optimized for the PolePlantingApp. This integration enables Claude to visually validate UI changes, test workflows, and ensure the app meets field worker requirements.

## What This Enables

1. **Visual Validation** - Claude can see the UI and validate against design principles
2. **Automated Testing** - Test real field worker scenarios automatically
3. **Offline Validation** - Ensure the app works without connectivity
4. **Mobile-First Development** - All testing optimized for mobile devices
5. **Iterative Refinement** - Claude can self-correct visual issues

## Directory Structure

```
playwright/
├── README.md                    # This file
├── PLAYWRIGHT_MCP_SETUP.md     # Installation guide
├── context/                     # Design principles and validation criteria
│   └── poleplanting-design-principles.md
├── agents/                      # Specialized testing agents
├── commands/                    # Quick commands for common tasks
├── workflows/                   # Complex testing workflows
└── config/                      # Playwright configuration
```

## Available Tools

### Agents (in .claude/agents/)
1. **poleplanting-mobile-reviewer** - Comprehensive mobile UX review
2. **field-workflow-tester** - Test real field worker scenarios
3. **offline-capability-validator** - Validate offline functionality

### Commands (in .claude/commands/)
1. **/screenshot-mobile** - Quick mobile viewport capture

## Quick Start

### 1. Install Playwright MCP
See `PLAYWRIGHT_MCP_SETUP.md` for detailed installation instructions.

### 2. Basic Usage

```bash
# Take a mobile screenshot
/screenshot-mobile

# Run comprehensive mobile review
@agent poleplanting-mobile-reviewer review the current app

# Test field worker workflow
@agent field-workflow-tester test the pole capture workflow

# Validate offline capabilities
@agent offline-capability-validator check offline functionality
```

### 3. Development Workflow

When making UI changes to PolePlantingApp:

1. Make your changes
2. Use `/screenshot-mobile` to capture current state
3. Run `@agent poleplanting-mobile-reviewer` for detailed feedback
4. Implement suggested improvements
5. Repeat until design principles are met

## Key Testing Scenarios

### Mobile Usability
- Touch targets ≥ 48x48px
- Text readable at 16px minimum
- High contrast for outdoor use
- Works with gloves

### Performance
- Loads in < 3 seconds on 3G
- Captures complete in < 2 minutes
- No data loss on connection changes

### Offline Capability
- All core features work offline
- Data persists through app restarts
- Syncs reliably when reconnected

## Design Principles

See `context/poleplanting-design-principles.md` for complete guidelines:

- **Mobile-first** - Designed for phones, not desktops
- **Field-ready** - Works in harsh conditions
- **Offline-first** - Connection is a bonus, not required
- **Fast & simple** - Every second counts in the field

## Integration with CLAUDE.md

The visual development workflow is documented in the main CLAUDE.md file. Key points:

1. Automatic validation on frontend changes
2. Self-correction based on screenshots
3. Iterative refinement without user intervention

## Troubleshooting

### Playwright MCP not working?
1. Check installation: `PLAYWRIGHT_MCP_SETUP.md`
2. Restart Claude Desktop
3. Verify with `/mcp` command

### Screenshots failing?
1. Ensure PolePlantingApp is running
2. Check viewport configuration
3. Verify browser permissions

### Tests timing out?
1. Increase timeout in config
2. Check network throttling settings
3. Verify app performance

## Next Steps

1. **Immediate**: Install Playwright MCP following setup guide
2. **First Test**: Run mobile reviewer on current app
3. **Iterate**: Use visual feedback to improve UI
4. **Automate**: Create custom workflows for repeated tests

## Resources

- [Playwright Documentation](https://playwright.dev)
- [MCP Protocol Spec](https://modelcontextprotocol.org)
- [Mobile Web Best Practices](https://web.dev/mobile/)
- [Offline First Principles](https://offlinefirst.org)

---

*This integration transforms Claude from coding blindfolded to having full visual awareness of UI changes, enabling truly autonomous frontend development for field worker applications.*