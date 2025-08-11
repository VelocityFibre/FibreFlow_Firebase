# AI Context Manager

A powerful tool that enhances development prompts using Google's Gemini AI with a 1M token context window. Perfect for providing rich, project-specific context to AI coding assistants like Claude, ChatGPT, or Copilot.

## Features

- 🧠 **1M Token Context Window** - Analyze entire codebases
- 🆓 **50 Free Requests/Day** - Worth $175/day on other platforms
- 🚀 **Project Agnostic** - Works with any programming language
- 🎯 **Smart Pattern Detection** - Learns your project's patterns
- 💾 **Intelligent Caching** - Fast repeated requests
- 🔄 **Graceful Fallback** - Pattern matching when offline

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone https://github.com/yourusername/ai-context-manager.git
   cd ai-context-manager
   ./setup_new_project.sh
   ```

2. **Add your API key**:
   ```bash
   # Get free key from: https://aistudio.google.com/app/apikey
   nano .env.local
   # Add: GOOGLE_AI_STUDIO_API_KEY=your-key-here
   ```

3. **Configure for your project**:
   ```bash
   cp config/project_config.yaml.template config/project_config.yaml
   nano config/project_config.yaml
   # Update project path and patterns
   ```

4. **Scan your codebase**:
   ```bash
   python agents/codebase_scanner.py
   ```

5. **Enhance prompts**:
   ```bash
   python cli/ai_cli.py enhance "Add user authentication with OAuth"
   ```

## Example Usage

### Basic Enhancement
```bash
$ python cli/ai_cli.py enhance "Add invoice management with PDF export"

🧠 Analyzing request...
✓ Intent: create_feature
✓ Found 5 relevant patterns
✅ Enhancement complete!

[Returns comprehensive prompt with:
- Clarified requirements
- Similar code patterns from your project  
- Step-by-step implementation plan
- Code examples following your conventions
- Integration points with existing code]
```

### Check Status
```bash
$ python cli/ai_cli.py status

📊 AI Context Manager Status
✅ Codebase indexed: 5,234 files
✅ Google AI: Connected
💰 Usage: 12/50 requests today
```

## How It Works

1. **Scans Your Codebase** - Builds an index of all your code patterns
2. **Analyzes Request** - Uses AI to understand what you want to build
3. **Finds Patterns** - Identifies similar code in your project
4. **Enhances Prompt** - Creates comprehensive context for AI assistants
5. **Delivers Results** - Provides implementation-ready specifications

## Supported Languages

- Python (.py)
- JavaScript/TypeScript (.js, .ts, .jsx, .tsx)
- Java (.java)
- Go (.go)
- C/C++ (.c, .cpp, .h)
- And more... (configurable)

## Cost Comparison

| Service | Daily Cost | Monthly Cost |
|---------|-----------|--------------|
| This Tool | $0 | $0 |
| Vertex AI | $175 | $5,250 |
| OpenAI | $200+ | $6,000+ |

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

Built with Google's Gemini 1.5 Pro via Google AI Studio.
