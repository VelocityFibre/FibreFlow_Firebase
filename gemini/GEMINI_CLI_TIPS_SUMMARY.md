# Gemini CLI Tips Summary

This document summarizes 11 powerful tips for using Gemini CLI as a comprehensive development partner rather than just a code generator.

## Overview
Transform Gemini CLI from a basic code generator into a full-fledged development partner that understands you and your workflow.

## Installation
```bash
npm install -g @google/gemini
```

## 11 Essential Tips

### 1. Free Authentication (Save Money)
- **Method**: Use Google login instead of API keys
- **Benefit**: 1,000 free requests per day vs paying per token
- **How**: Run `/auth` and choose "Log in with Google"
- **Impact**: Removes cost anxiety for experimentation

### 2. Gemini Markdown File (Master Configuration)
- **Purpose**: Acts as a system prompt for all interactions
- **Location**: `gemini.md` in project root
- **Contents**:
  - Context about your app and tech stack
  - Development standards (e.g., TDD approach)
  - Tool preferences for different scenarios
- **Example**:
  ```markdown
  ## Context
  - Python FastAPI backend
  - React TypeScript frontend
  - PostgreSQL database
  
  ## Standards
  - Use test-driven development
  - Follow PEP 8 for Python
  
  ## Tool Preferences
  - Use context7 MCP server for external documentation
  ```

### 3. Custom Slash Commands
- **Purpose**: Create reusable workflows
- **Location**: `.gemini/commands/` directory
- **Example**: `/test-and-commit` command that:
  - Analyzes files
  - Creates tests if missing
  - Runs tests
  - Fixes errors
  - Generates commit message
- **Benefit**: No more repetitive prompt engineering

### 4. Memory System
- **Commands**:
  - `/memory add [fact]` - Store permanent facts
  - `/memory show` - Display all stored memories
- **Use Case**: Remember solutions to avoid re-solving problems
- **Example**: `/memory add "For all LLM queries in this app use OpenAI GPT-4"`
- **Benefit**: Creates a "second brain" for your development process

### 5. Checkpoint/Restore
- **Purpose**: Create save points during development
- **Commands**:
  - Checkpoints created automatically
  - `/restore` - Shows list of available restore points
  - `/restore [checkpoint-id]` - Restore to specific point
- **Analogy**: "Like having multiple save slots in a video game"

### 6. Test-Driven Development (TDD)
- **Process**: Test → Fail → Implement → Loop
- **Configuration**: Add to `gemini.md`:
  ```markdown
  Always use test-driven development cycle
  ```
- **Benefits**:
  - Faster path to functional features
  - Constant validation every few minutes
  - Production-ready test suite
- **Note**: Gemini CLI is built with TDD logic at its core

### 7. Multimodal Capabilities
- **Feature**: Use images for better debugging and UI development
- **How**: Type `@` and select image file
- **Stat**: Vision-enabled models perform 200% better on non-crashing bug debugging
- **Use Cases**:
  - UI debugging with screenshots
  - Using design references for building features
  - Automated UI healing based on visual output

### 8. File References
- **Syntax**: `@path/to/file` in commands
- **Use Case**: Reference guidelines, schemas, or documentation
- **Example**: Custom command that audits code against UI/UX guidelines:
  ```
  @guidelines/ui.md
  @guidelines/ux.md
  @components/MyComponent.tsx
  ```
- **Benefit**: Ensures consistency with project standards

### 9. Context Management
- **Commands**:
  - `/clear` - Complete context reset (switching features)
  - `/compress` - Summarize conversation (continuing same feature)
- **Results**: Up to 90% reduction in token usage with compression
- **Strategy**:
  - Clear when switching to completely new feature
  - Compress when context is large but continuing same work
- **Goal**: Maintain quality and speed by managing context properly

### 10. Auto-Accept Modes
- **Three Levels**:
  1. **None** (default): Approve everything manually
  2. **Safe**: Auto-approve read-only operations
  3. **YOLO**: Fully automated (use `--yolo` flag)
- **Configuration**: `.gemini/settings.json`:
  ```json
  {
    "autoAccept": true
  }
  ```
- **Best Practice**: Match mode to your skill level and task criticality

### 11. Massive Context Window
- **Size**: 1 million tokens (5x larger than Claude Code)
- **Benefit**: Can load entire codebases for comprehensive understanding
- **Impact**: Prevents errors from lack of project context
- **Analogy**: "Junior dev (narrow focus) vs Senior dev (knows everything)"

## Key Takeaways

1. **Cost-Effective**: Free tier with 1,000 daily requests
2. **Customizable**: Master config file and custom commands
3. **Intelligent**: Memory system and large context window
4. **Safe**: Checkpoint system and configurable auto-accept
5. **Modern**: Multimodal capabilities and TDD-focused

## Best Practices

- Start with authentication via Google for free usage
- Set up your `gemini.md` file immediately
- Create custom commands for repetitive workflows
- Use memory to store project-specific decisions
- Compress context regularly to maintain performance
- Match auto-accept mode to your experience level
- Leverage the massive context window for better results

## Resources
- Gemini CLI GitHub repository for command examples
- Documentation for advanced features and configurations