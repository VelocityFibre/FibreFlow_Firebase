# Argon Agent - Standalone Setup Guide

## Overview
The Argon Agent is a multi-database AI assistant for FibreFlow that can run independently while maintaining connections to your production databases.

## Quick Setup

### 1. Clone the Branch
```bash
git clone -b argon-agent https://github.com/your-repo/fibreflow.git argon-local
cd argon-local
```

### 2. Run Setup Script
```bash
cd agents/argon
./setup-local.sh
```

### 3. Configure Database Access

Edit `.env.local` with your credentials:

```env
# Get from Neon Console > Connection Details
NEON_CONNECTION_STRING=postgresql://user:pass@ep-name.region.aws.neon.tech/dbname?sslmode=require

# Get from Firebase Console > Project Settings
FIREBASE_PROJECT_ID=fibreflow-73daf
FIREBASE_API_KEY=your-api-key-here
```

### 4. Database Access Requirements

#### Neon PostgreSQL
1. Log into [Neon Console](https://console.neon.tech)
2. Go to your project settings
3. Under "Allowed IPs", add your laptop's IP address
4. Copy the connection string from "Connection Details"

#### Firebase/Firestore
1. No IP whitelisting needed (uses Web SDK)
2. Authentication handled through API key
3. Read-only access by default

### 5. Build and Run

```bash
# From project root
npm run build

# Run the agent
npm start

# Or for development with auto-reload
npm run dev
```

### 6. Access the Agent

Open your browser to: `http://localhost:4200/argon`

## Features Available Locally

- ✅ **Query Builder** - Execute cross-database queries
- ✅ **System Metrics** - View project statistics
- ✅ **Connection Monitor** - Real-time database health
- ✅ **Data Export** - Export for AI assistants
- ✅ **Read-Only Access** - Safe for production data

## Troubleshooting

### Database Connection Issues

1. **Neon Connection Failed**
   - Check IP is whitelisted in Neon Console
   - Verify connection string is correct
   - Ensure SSL mode is set to 'require'

2. **Firebase Connection Failed**
   - Verify API key is correct
   - Check project ID matches
   - Ensure browser allows Firebase SDK

### Test Connections

Run in browser console:
```javascript
// Load and run test script
const script = document.createElement('script');
script.src = '/test-argon-connections.js';
document.head.appendChild(script);
```

## Security Notes

- Never commit `.env.local` to git
- Use read-only database credentials when possible
- The agent operates in read-only mode by default
- All queries are logged for audit purposes

## Development Tips

1. **Use Chrome DevTools** - Monitor network requests and console logs
2. **Check Firestore Rules** - Ensure read access is allowed
3. **Monitor Query Performance** - Neon dashboard shows query analytics
4. **Test Offline** - Agent handles connection failures gracefully

## Support

- Check `agents/argon/README.md` for detailed documentation
- Review `ARGON_PDP_2025-01-30.md` for architecture details
- Database schemas in `models/argon.models.ts`