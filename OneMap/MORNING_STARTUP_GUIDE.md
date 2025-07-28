# OneMap Morning Startup Guide - Fix the 3-Hour Problem

## 🚨 The Problem
Every morning when you say "continue", Claude takes 3 hours to figure out what to do because:
1. No automatic context loading
2. Searches through entire codebase
3. Doesn't know current state
4. Re-discovers everything from scratch

## ✅ The Solution: Magic Words & Instant Context

### 🎯 Option 1: Use the New Status Command (BEST)
```
You: /onemap-status
```
Claude instantly knows:
- Where we left off
- What's next
- Exact command to run

### 🎯 Option 2: Direct OneMap Commands
Instead of "continue", say:
```
"Process next OneMap CSV"
"OneMap status"
"Use the onemap-data-agent"
```

### 🎯 Option 3: Morning Startup Alias
Add to your terminal:
```bash
# Add to ~/.bashrc
alias morning='cd ~/VF/Apps/FibreFlow && bash OneMap/scripts/morning-status.sh'
```

Then just type `morning` to see everything!

## 📋 What Gets Shown Instantly

1. **Last Activity**
   - Last 5 processed files
   - Processing dates
   - Any issues

2. **Next Action**
   - Exact file to process
   - Ready-to-run command
   - No searching needed

3. **Quick Stats**
   - Total files processed
   - Current state
   - Warnings if any

## 🚀 Morning Workflow (5 Seconds Instead of 3 Hours)

### Old Way (3 hours):
```
You: "Continue where we left off"
Claude: [Searches everywhere, reads 50 files, gets confused]
... 3 hours later ...
Claude: "What would you like to continue with?"
```

### New Way (5 seconds):
```
You: "/onemap-status"
Claude: "Last processed: June 22. Next: July 16. 
        Run: cd OneMap && node scripts/bulk-import-onemap.js 'Lawley July Week 3 16072025.csv'"
You: "Do it"
Claude: [Executes immediately]
```

## 💡 Key Insights

1. **Specific Context Wins**: "Process OneMap CSV" beats "continue"
2. **Status First**: Always check status before processing
3. **Direct Commands**: Use exact commands, not vague requests

## 🔧 Advanced Tips

### Save Daily State to Memory
End each session with:
```
"Save to memory: OneMap last processed July 16, next is July 17"
```

### Morning Context Injection
Start with:
```
"Load OneMap context and show status"
```

### Skip the Catch-up
Just say what you want:
```
"Process Lawley July Week 3 16072025.csv"
```

## 📊 Current State Reference
- **Last Processed**: June 22, 2025 (had data issues)
- **Next to Process**: July 16, 2025
- **Missing Files**: Late June, Early July
- **Total Processed**: 19 files

## 🎉 Result
No more 3-hour morning startup! Just instant awareness and action.

---
*Created: 2025-01-30*
*Purpose: Eliminate morning startup delays*