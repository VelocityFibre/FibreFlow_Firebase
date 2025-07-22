# CLAUDE_CORE.md - Essential Context Only

<claude-context version="2.0" priority="critical">
  <metadata>
    <last-updated>2025-07-18</last-updated>
    <confidence>high</confidence>
    <extends>
      - .claude/modules/safety.md
      - .claude/modules/workflows.md
      - .claude/modules/reference.md
    </extends>
  </metadata>
</claude-context>

## 📑 Quick Navigation
- [🚨 Safety](#safety) - Prevent code loss
- [⚡ Commands](#commands) - Essential commands  
- [🎯 Principles](#principles) - Core development rules
- [📋 Workflow](#workflow) - Development process
- [🔍 Validation](#validation) - antiHall checks
- Press Ctrl+F to search | Full docs in `.claude/modules/`

## 🚨 UNIVERSAL SAFETY RULE

<critical-rules priority="1">
Before ANY destructive operation (`jj new`, `git reset`, `rm -rf`):
1. **ASK** for explicit confirmation
2. **SHOW** what will be affected
3. **SUGGEST** safer alternatives
4. **REQUIRE** typing "CONFIRM" to proceed

**API Keys**: NEVER remove - add to `.gitignore` instead!
**Working Directory**: Changes affect future deployments, even after build!
</critical-rules>

## ⚡ Top 10 Commands (90% of Tasks)

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `deploy` | Build & deploy to Firebase | ALWAYS test this way |
| `jj st` | Check what's changed | Before any operation |
| `jj diff` | See detailed changes | Review before deploy |
| `npm run lint` | Check code quality | Before every commit |
| `npm run build` | Verify build works | Before deployment |
| `antiHall check` | Validate code exists | Before suggesting code |
| `grep -r "term"` | Search codebase | Finding implementations |
| `!db {feature}` | Show DB structure | Understanding data |
| `!routes {feature}` | Show feature routes | Navigation structure |
| `/create-feature` | Scaffold new feature | Starting development |

## 🎯 Core Development Principles

<core-principles confidence="high" last-validated="2025-07-18">

### 1. Simplicity First
```
❌ Complex: "Add AI-powered analysis with ML"
✅ Simple: "Use a JSON lookup"
```

### 2. Validate Everything
```bash
# BEFORE suggesting ANY service method:
cd antiHall && npm run check:local "methodName"
```

### 3. Deploy-First Testing
- NO `ng serve` - always `deploy`
- Test on live Firebase: https://fibreflow-73daf.web.app
- Real environment = real results

### 4. Project Context
- **Tech**: Angular 20 + Firebase + TypeScript 5.8
- **Locale**: South Africa (ZAR, en-ZA, DD/MM/YYYY)
- **Themes**: light, dark, vf, fibreflow
- **Patterns**: Standalone components, inject(), signals

</core-principles>

## 📋 Essential Workflow

### Starting Any Task
```markdown
1. Check context: `!db {feature}` `!routes {feature}`
2. Validate approach: `antiHall check "pattern"`
3. Implement: Follow existing patterns
4. Test: `deploy` and check live site
5. Verify: No errors, works in all themes
```

### Feature Development
```markdown
1. Specification first: `SPEC-XXX-001.md`
2. Create PRP: Use `prp/templates/`
3. Scaffold: `/create-feature {name}`
4. Implement: CRUD first, enhance later
5. Deploy frequently: Every 30 mins
```

## 🔍 Mandatory Validations

<validation-rules confidence="high">

### antiHall is REQUIRED for:
- Service method calls: `this.service.method()`
- Component properties: `component.property`
- Angular/RxJS APIs: Lifecycle hooks, operators
- Firebase operations: All Firestore methods

### SKIP antiHall for:
- Pure HTML/CSS (no bindings)
- Basic directives: `*ngFor`, `*ngIf`
- Theme variables: Already validated

</validation-rules>

## 🚀 Quick Project Info

- **URL**: https://fibreflow-73daf.web.app
- **Stack**: Angular 20.0.6, Firebase 11.9.1, Material 20.0.3
- **Node**: 20.19.2+ (use nvm)
- **Critical Files**:
  - `CLAUDE.md` - Full documentation
  - `app.routes.ts` - All routes
  - `antiHall/` - Validation tool
  - `.claude/` - Extended docs

## ⚠️ Common Pitfalls

| Issue | Solution |
|-------|----------|
| API keys in code | Add to `.gitignore`, never delete |
| `ng serve` testing | Always use `deploy` |
| Hardcoded colors | Use theme variables |
| `any` types | Proper TypeScript types |
| Missing projectId | Always filter by project |

## 🆘 Quick Help

- **Lost code?** Check `jj op log` for recovery
- **Build fails?** Run `npm run lint` first
- **Can't find method?** Update antiHall: `npm run parse:improved`
- **Theme issues?** Test all 4 themes
- **Full docs?** See `.claude/modules/`

---

<quick-reference>
Remember: Simple > Complex | Deploy > Local | Validate > Assume
Extended documentation available in `.claude/modules/`
</quick-reference>