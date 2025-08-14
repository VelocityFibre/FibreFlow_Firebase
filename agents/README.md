# FibreFlow Neon+Gemini Agent

This directory contains the Python backend for the Neon Database Agent that powers natural language queries in FibreFlow.

## Quick Start

### 1. Start the Python Server

```bash
cd agents
source venv/bin/activate
python simple_server.py
```

The server will start on http://localhost:8000

### 2. Access in FibreFlow

1. Navigate to FibreFlow: https://fibreflow-73daf.web.app
2. Click on "Analytics" → "Neon Database Agent" in the sidebar
3. Start asking questions about your data!

## Features

- **Natural Language Queries**: Ask questions in plain English
- **Google Gemini Integration**: Powered by Gemini 1.5 Pro
- **Demo Mode**: Works without database connection for testing
- **Real-time Status**: Shows connection status and agent availability
- **Suggested Questions**: Pre-built queries to get started

## Example Questions

- "How many poles have been planted in Lawley?"
- "What's the status distribution for all poles?"
- "Show me recent status changes"
- "Which agent has processed the most poles?"
- "What percentage of poles are approved?"

## Architecture

```
agents/
├── simple_server.py      # FastAPI server (demo mode)
├── src/                  # Full implementation (with DB)
│   ├── api.py           # FastAPI endpoints
│   ├── agent_gemini.py  # Gemini integration
│   ├── database.py      # Neon connection
│   └── config.py        # Configuration
├── test_gemini_only.py  # Test Gemini API
└── .env.local           # Environment variables
```

## Environment Variables

Create `.env.local` with:
```
GOOGLE_AI_STUDIO_API_KEY=your-gemini-api-key
NEON_CONNECTION_STRING=postgresql://... (optional for demo)
```

## Troubleshooting

### Server not starting?
```bash
# Check if port 8000 is already in use
lsof -i :8000

# Kill existing process if needed
kill -9 <PID>
```

### Connection issues?
- The Angular app expects the server on localhost:8000
- Check CORS settings if accessing from different origin
- Demo mode works without database connection

### Virtual environment issues?
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Development

### Running Full Agent (with Database)
```bash
cd src
python api.py
```

### Testing Gemini API
```bash
python test_gemini_only.py
```

### API Documentation
When server is running, visit:
- http://localhost:8000/docs - Swagger UI
- http://localhost:8000/redoc - ReDoc

## Integration with FibreFlow

The Angular service (`NeonGeminiAgentService`) communicates with this Python backend via REST API. The service is already integrated into:
- Dev Panel (as a fallback option)
- Neon Agent page (dedicated interface)

## Future Enhancements

1. **Database Integration**: Connect to actual Neon database
2. **Query Caching**: Redis integration for performance
3. **Advanced Analytics**: More complex SQL generation
4. **History Tracking**: Save and replay queries
5. **Export Functionality**: Download results as CSV/Excel