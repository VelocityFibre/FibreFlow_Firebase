# AI Context Manager - Frequently Asked Questions

## 🤔 General Questions

### Q: What exactly does this tool do?
**A:** It enhances your prompts with deep knowledge about your specific codebase before sending them to AI assistants. Instead of getting generic code, you get code that follows YOUR patterns, conventions, and integrates with YOUR existing systems.

### Q: How is this different from just using ChatGPT/Claude directly?
**A:** 

| Direct AI Usage | With AI Context Manager |
|-----------------|------------------------|
| Generic boilerplate code | Code matching your patterns |
| Wrong framework assumptions | Knows your exact tech stack |
| No knowledge of your code | References your similar features |
| Suggests SQL for NoSQL project | Uses your actual database |
| Generic variable names | Your naming conventions |

### Q: Is this just for large teams/enterprises?
**A:** No! It's especially valuable for:
- **Solo developers**: Maintain consistency across your project
- **Small teams**: Everyone follows same patterns
- **Open source**: Help contributors match your style
- **Learning**: Understand patterns in new codebases

### Q: Do I need to be an AI expert?
**A:** Not at all! The tool handles all AI complexity. You just type what you want to build, and it enhances your request automatically.

---

## 💰 Cost & Pricing

### Q: Is this really free?
**A:** Yes! Google AI Studio provides 50 requests per day completely free. This is worth approximately $175/day if using other platforms.

### Q: What happens after 50 requests?
**A:** Three options:
1. Wait until midnight PT (resets daily)
2. Use pattern matching mode (no AI, still helpful)
3. Upgrade to paid tier (rarely needed)

### Q: Hidden costs?
**A:** None. You only need:
- Free Google account
- Free API key from Google AI Studio
- Your computer (no cloud costs)

---

## 🔧 Technical Questions

### Q: What languages/frameworks does it support?
**A:** Any programming language! Common ones include:
- JavaScript/TypeScript (React, Angular, Vue, Node.js)
- Python (Django, Flask, FastAPI)
- Java (Spring, Android)
- Go, Rust, C++, PHP, Ruby, etc.

### Q: How large can my codebase be?
**A:** Tested with codebases up to 50,000 files. The scanner is efficient and creates an index, so size isn't a limitation.

### Q: Does it work with private/proprietary code?
**A:** Yes, completely safe:
- Your code never leaves your machine during scanning
- Only the enhanced prompt (not your code) goes to Google
- You control what information is included
- Can exclude sensitive files from scanning

### Q: What about mono-repos?
**A:** Excellent support! You can:
- Scan entire mono-repo
- Scan specific packages
- Create different configs per package
- Share patterns across packages

---

## 🚀 Usage Questions

### Q: How long does setup take?
**A:** Typically 10-15 minutes:
- 2 min: Download and install
- 3 min: Get API key and configure
- 5-10 min: Initial codebase scan
- Ready to use!

### Q: How often should I rescan my codebase?
**A:** Depends on activity:
- Active development: Daily or weekly
- Stable projects: Monthly
- Before major features: Always
- Can automate with cron

### Q: Can multiple team members use it?
**A:** Yes! Each person needs their own API key (free), but can share:
- Codebase index
- Configuration
- Enhanced prompts
- Custom patterns

### Q: Does it work offline?
**A:** Partially:
- Scanning works offline
- Pattern matching works offline
- AI enhancement needs internet
- Cached responses available offline

---

## 🔒 Security & Privacy

### Q: Is my code safe?
**A:** Yes, very safe:
- Code scanning happens locally only
- No code uploaded anywhere
- Only enhanced prompts sent to Google
- You control all data flow

### Q: What data goes to Google?
**A:** Only:
- Your request text ("Add invoice feature")
- Project statistics (file count, tech stack)
- Pattern names (not actual code)
- Enhanced prompt comes back

### Q: Can I use this for sensitive projects?
**A:** Yes, with precautions:
- Exclude sensitive files from scanning
- Review enhanced prompts before sharing
- Use pattern matching mode for ultra-sensitive work
- Keep API key secure

### Q: GDPR/Compliance concerns?
**A:** Compliant because:
- No personal data collected
- No code stored externally  
- You control all data
- Can be used in regulated industries

---

## 🐛 Troubleshooting

### Q: "API key not found" error
**A:** Common fixes:
```bash
# Check file exists
ls -la .env.local

# Check format (one line, no spaces)
GOOGLE_AI_STUDIO_API_KEY=AIzaSy...

# In correct directory?
pwd  # Should be in ai-context/
```

### Q: "Rate limit exceeded"
**A:** You've used 50 requests today:
- Check usage: `ai status`
- Resets at midnight PT
- Use pattern mode meanwhile

### Q: Enhancement seems generic?
**A:** Usually means:
- Haven't scanned codebase yet
- Wrong project path in config
- Scanning excluded your files
- Check: `ls cache/codebase_index.json`

### Q: "Module not found" errors
**A:** Not in virtual environment:
```bash
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

---

## 🎯 Best Practices

### Q: What makes a good request?
**A:** Be specific about:
- What you want to build
- Any constraints/requirements
- Integration points
- Similar existing features

**Good**: "Add admin dashboard with user metrics charts like our sales dashboard"
**Less helpful**: "Add dashboard"

### Q: Should I save enhanced prompts?
**A:** Yes! They're valuable for:
- Documentation
- Team sharing
- Future reference
- Onboarding

### Q: How to maximize the free tier?
**A:** Tips:
- Batch similar requests
- Save/reuse enhancements
- Use for complex features
- Cache common patterns

---

## 🔄 Integration Questions

### Q: Works with VS Code?
**A:** Yes! Through:
- Terminal integration
- Copy/paste to Copilot
- Extension potential
- Task automation

### Q: Can I integrate with CI/CD?
**A:** Yes:
```bash
# In CI pipeline
ai enhance "Generate tests for new features" > test_spec.md
# Use for test generation
```

### Q: API available?
**A:** Currently CLI only, but:
- Easy to wrap in scripts
- Can call from any language
- REST API planned

### Q: Works with Cursor/Windsurf/Aider?
**A:** Yes! Any AI coding tool that accepts prompts can benefit from enhanced context.

---

## 🚀 Advanced Questions

### Q: Can I train it on my patterns?
**A:** It automatically learns from scanning, but you can:
- Add custom pattern definitions
- Create pattern templates
- Build pattern library
- Share team patterns

### Q: Multiple projects?
**A:** Yes:
```bash
# Different configs
ai --config project1.yaml enhance "..."
ai --config project2.yaml enhance "..."
```

### Q: Can it generate tests?
**A:** Absolutely:
```bash
ai enhance "Generate comprehensive tests for UserService"
# Returns tests matching your testing patterns
```

### Q: Documentation generation?
**A:** Yes:
```bash
ai enhance "Document the authentication flow with diagrams"
# Creates docs matching your style
```

---

## 💡 Tips & Tricks

### Q: Hidden features?
**A:** Some lesser-known capabilities:
- Multi-line input with `-e` flag
- Different models with `-m flash` (faster)
- Batch processing with scripts
- Custom pattern injection

### Q: Performance tips?
**A:** 
- Use Flash model for simple tasks
- Cache common requests
- Exclude test/build files from scan
- Parallel scanning for large codebases

### Q: Future features?
**A:** Roadmap includes:
- IDE plugins
- Real-time code analysis
- Team pattern sharing
- Multi-model support
- Streaming responses

---

## 🆘 Getting Help

### Q: Where to report issues?
**A:** 
- GitHub issues (preferred)
- Documentation updates
- Community discussions

### Q: Can I contribute?
**A:** Yes! Contributions welcome:
- Bug fixes
- New patterns
- Documentation
- Language support

### Q: Commercial support?
**A:** Currently community-supported, but enterprise support planned.

---

*Don't see your question? Open an issue or contribute to this FAQ!*