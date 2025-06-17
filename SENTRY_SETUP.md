# Sentry Integration Setup for FibreFlow

## Overview
Sentry has been integrated into FibreFlow to provide real-time error tracking, performance monitoring, and debugging capabilities. The integration maintains compatibility with existing Firebase logging while adding enhanced error context and production debugging features.

## Setup Steps

### 1. Create Sentry Account
1. Go to [https://sentry.io](https://sentry.io) and sign up for a free account
2. Create a new project:
   - Platform: JavaScript
   - Framework: Angular
   - Project name: `fibreflow`

### 2. Get Your DSN
1. After creating the project, you'll receive a DSN (Data Source Name)
2. It looks like: `https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/PROJECT_ID`

### 3. Update Environment Files
Add your DSN to both environment files:

```typescript
// src/environments/environment.ts
sentry: {
  dsn: 'YOUR_DSN_HERE',
  environment: 'development'
}

// src/environments/environment.prod.ts
sentry: {
  dsn: 'YOUR_DSN_HERE',
  environment: 'production'
}
```

### 4. Test the Integration
1. Start the development server: `npm start`
2. Navigate to `/debug/sentry-test` (you'll need to add this route)
3. Click the test buttons to generate different types of errors
4. Check your Sentry dashboard to see the captured errors

## Features Implemented

### 1. Error Tracking
- Automatic capture of all unhandled errors
- Integration with existing Angular error handler
- Maintains Firebase logging alongside Sentry
- Rich error context (URL, user actions, stack traces)

### 2. Performance Monitoring
- Tracks page load times
- Monitors API calls and Firebase operations
- Identifies slow database queries
- Provides performance insights

### 3. Session Replay
- Records user sessions when errors occur
- Helps reproduce bugs in production
- Configurable sample rates for privacy/performance

### 4. Custom Error Context
The integration adds FibreFlow-specific context to errors:
- Current route/URL
- Error codes (Firebase, HTTP)
- Special handling for Angular-specific errors (NG0200)
- User-friendly error messages

## Configuration

### Sample Rates (Adjustable in main.ts)
- **Development**:
  - Traces: 100% (all transactions monitored)
  - Session Replay: 50% 
- **Production**:
  - Traces: 10% (for performance)
  - Session Replay: 10% (100% on errors)

### Error Filtering
You can filter errors in `main.ts` using the `beforeSend` hook:
```typescript
beforeSend(event, hint) {
  // Filter out specific errors
  if (event.exception && shouldFilterError(hint.originalException)) {
    return null; // Don't send to Sentry
  }
  return event;
}
```

## Benefits

1. **Better Debugging**: Full stack traces with source maps in production
2. **User Impact**: See how many users are affected by each error
3. **Trends**: Track error rates over time and after deployments
4. **Performance**: Identify performance bottlenecks
5. **Proactive Monitoring**: Get alerts for new or trending errors

## MCP Integration (Optional)
To enable AI-assisted debugging with Sentry MCP:

1. Install MCP in your AI coding tool (Cursor, Claude Code, etc.)
2. Add to your MCP config:
```json
{
  "mcpServers": {
    "Sentry": {
      "command": "npx",
      "args": ["mcp-remote@latest", "https://mcp.sentry.dev/sse"]
    }
  }
}
```

3. The AI can then:
   - Access error details directly
   - Analyze patterns across errors
   - Suggest fixes based on error context
   - Create issues and track resolutions

## Monitoring Dashboard
After setup, monitor your app at:
- Issues: See all errors with details
- Performance: Track web vitals and transactions
- Releases: Track error rates by version
- User Feedback: Collect feedback when errors occur

## Next Steps
1. Add user context: `Sentry.setUser({ id, email })`
2. Create custom breadcrumbs for better debugging
3. Set up alerts for critical errors
4. Configure source map uploads for production builds