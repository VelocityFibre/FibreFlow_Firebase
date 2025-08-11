# /gem - Gemini Prompt Enhancement

Enhances your development request using the AI Context Manager with Gemini's 1M token context window.

## Usage

```
/gem [your request]
```

## Examples

```
/gem Fix the spacing between navigation items in the header

/gem Add dark mode toggle to user preferences 

/gem Optimize the Firebase queries in pole tracker service

/gem Create comprehensive tests for the authentication flow
```

## What it does

1. Takes your request
2. Runs it through the AI Context Manager 
3. Uses Gemini 1.5 Pro (1M context) to analyze your entire codebase
4. Returns an enhanced prompt with:
   - Your project's specific patterns
   - Similar code references
   - Step-by-step implementation
   - Code examples from YOUR codebase
   - Integration points

## Aliases

- `/gem` - Short version
- `/gemini` - Full name
- `/enhance` - Alternative

## Notes

- Uses 1 of your 50 daily free requests
- Response time: 15-30 seconds
- Includes FibreFlow-specific context
- Works with any development request