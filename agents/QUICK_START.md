# 🚀 Neon AI Agent - Quick Start Guide

## 📍 How to Access the Neon AI Agent

### Option 1: Test Locally (5 minutes)

1. **Start the backend:**
```bash
cd /home/ldp/VF/Apps/FibreFlow/agents
python simple_server.py
```
You should see:
```
🚀 Starting FibreFlow Neon+Gemini Agent
📱 API Server: http://localhost:8000
🤖 LLM Model: ✅ Gemini 1.5 Pro
🗄️  Database: ✅ Neon PostgreSQL
```

2. **Open FibreFlow:**
```bash
cd /home/ldp/VF/Apps/FibreFlow
ng serve
```

3. **Access in browser:**
- Go to: `http://localhost:4200`
- Login (if auth is enabled)
- Look for **"Analytics & AI"** section in the left menu
- Click **"Neon AI Agent"**

### Option 2: Deploy to Cloud (15 minutes)

1. **Deploy backend to Cloud Run:**
```bash
cd /home/ldp/VF/Apps/FibreFlow/agents
./deploy-always-on.sh
```

Wait for output like:
```
🎉 Always-On Deployment Complete!
📱 Service URL: https://neon-agent-xxxxx.us-central1.run.app
```

2. **Update Angular with your service URL:**
Edit `/home/ldp/VF/Apps/FibreFlow/src/app/core/services/neon-agent.service.ts`

Find this line (around line 89):
```typescript
private readonly CLOUD_URL = 'https://neon-agent-814485644774.us-central1.run.app'; // TODO: Update after deployment
```

Replace with your actual URL from step 1.

3. **Deploy Angular app:**
```bash
cd /home/ldp/VF/Apps/FibreFlow
npm run build
firebase deploy --only hosting
```

4. **Access online:**
- Go to: `https://fibreflow-73daf.web.app`
- Login
- Navigate to **Analytics & AI → Neon AI Agent**

## 🎯 Where to Find It in the Menu

Once you're in FibreFlow:

```
📂 Main Menu
  └── 📊 Analytics & AI
      ├── 🤖 Argon AI Assistant
      └── 🧠 Neon AI Agent  ← Click here!
```

## 💬 What You'll See

1. **Connection Status Card** - Shows if database and AI are ready
2. **AI Chat Interface** - Natural language queries
3. **Example Questions** - Click to try them:
   - "How many poles are approved in Lawley?"
   - "Which agent has the most installations?"
   - "What is the status of pole LAW.P.B167?"
   - "Show me poles with pending permissions"

## 🔧 Troubleshooting

### Can't see "Neon AI Agent" in menu?
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Check console for errors: `F12` → Console tab

### Backend not connecting?
```bash
# Check if running locally
curl http://localhost:8000/health

# Check cloud service
curl https://your-service-url.run.app/health
```

### Database connection issues?
- Verify `.env.local` has correct `NEON_CONNECTION_STRING`
- Check if Neon database is active

## 📝 Quick Test

Once you're in the Neon AI Agent page:

1. **Check status indicators** - Should show green checkmarks
2. **Try an example query** - Click one of the blue example buttons
3. **Ask your own question** - Type something like "How many records are in the database?"
4. **See the response** - AI will analyze and answer with data

## 🎉 Success!

You should now see:
- ✅ Green status indicators
- 💬 Chat interface ready
- 🤖 AI responding to queries
- 📊 Real database data in responses

Need help? Check the detailed guide: `agents/README-ALWAYS-ON.md`