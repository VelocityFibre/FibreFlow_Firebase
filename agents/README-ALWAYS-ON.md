# FibreFlow Neon + Gemini AI Agent

Always-on natural language interface for FibreFlow data using Google Cloud Run.

## 🚀 Quick Deploy

```bash
# Deploy always-on service to Cloud Run
./deploy-always-on.sh

# Monitor service health
./monitor-service.sh
```

## 🏗️ Architecture

### Always-On Features
- **Min instances: 1** - Service never goes cold
- **Connection pooling** - Efficiently handles concurrent requests
- **Keep-alive monitoring** - Health checks every 30 seconds
- **Auto-healing** - Automatic restart on failures
- **Extended timeout** - 15 minutes for complex queries
- **Resource allocation** - 1GB RAM, 1 CPU core

### Components
- **FastAPI Server** (`simple_server.py`) - API backend with connection pooling
- **Angular Service** (`neon-agent.service.ts`) - Client-side integration
- **Chat Interface** (`neon-agent-chat.component.ts`) - User interface
- **Cloud Run** - Serverless hosting with always-on configuration

## 🔗 Integration

### How it Works Like Argon
1. **Automatic URL Detection** - Tries local first, falls back to cloud
2. **Health Monitoring** - Continuous monitoring with automatic failover
3. **Connection Pooling** - Maintains persistent database connections
4. **Real-time Status** - Shows connection, database, and AI status
5. **Chat Interface** - Natural language queries with formatted responses

### Angular Integration
```typescript
// In your component
export class MyComponent {
  neonAgent = inject(NeonAgentService);
  
  ngOnInit() {
    // Service automatically connects and monitors health
    console.log('Ready:', this.neonAgent.isReady());
    console.log('Status:', this.neonAgent.healthStatus());
  }
  
  async askQuestion() {
    this.neonAgent.sendChatMessage('How many poles are approved?')
      .subscribe(response => {
        console.log('AI Response:', response.content);
      });
  }
}
```

## 🔧 Configuration

### Environment Variables (Cloud Run)
```
NEON_CONNECTION_STRING=postgresql://user:pass@host:5432/db
GOOGLE_AI_STUDIO_API_KEY=your_gemini_api_key
KEEP_ALIVE=true
CONNECTION_POOL_SIZE=10
```

### Service URLs
- **Local Development**: `http://localhost:8000`
- **Production**: `https://neon-agent-814485644774.us-central1.run.app`

### Angular Route
- **URL**: `/neon-agent`
- **Component**: `NeonAgentChatComponent`
- **Guard**: `authGuard` (requires login)

## 📊 Monitoring

### Health Endpoints
- `/health` - Basic health check
- `/health/detailed` - Detailed status with connection pool info
- `/database/info` - Database schema and statistics

### Query Endpoint
- `/query` (POST) - Natural language query processing
  ```json
  {
    "question": "How many poles are approved in Lawley?",
    "user_id": "optional_user_id",
    "include_sql": false,
    "include_metadata": true
  }
  ```

### Response Format
```json
{
  "success": true,
  "answer": "There are 3,456 poles approved in Lawley project...",
  "sql_query": "SELECT COUNT(*) FROM...",
  "execution_time": 1250,
  "metadata": {
    "llm_model": "gemini-1.5-pro",
    "results_count": 1,
    "query_type": "database"
  }
}
```

## 🛡️ Security

- **SQL Injection Protection** - Only SELECT queries allowed
- **Input Validation** - Blocks dangerous keywords
- **Connection Pooling** - Prevents connection exhaustion
- **CORS Configuration** - Only allows FibreFlow origins
- **Authentication** - Requires Firebase auth token

## 📈 Performance

### Always-On Benefits
- **Zero Cold Starts** - Min instances = 1
- **Connection Reuse** - Pool maintains warm connections
- **Concurrent Handling** - Up to 80 concurrent requests
- **Fast Responses** - Average < 2 seconds for complex queries
- **Auto-scaling** - Scales to 10 instances under load

### Monitoring Commands
```bash
# View real-time logs
gcloud run services logs tail neon-agent --region=us-central1

# Check service status
gcloud run services describe neon-agent --region=us-central1

# Update configuration
gcloud run services update neon-agent --region=us-central1 --set-env-vars=KEY=VALUE
```

## 🚨 Troubleshooting

### Common Issues
1. **Service not responding** → Check `./monitor-service.sh`
2. **Database connection failed** → Verify `NEON_CONNECTION_STRING`
3. **AI queries failing** → Check `GOOGLE_AI_STUDIO_API_KEY`
4. **Angular can't connect** → Update service URL in `neon-agent.service.ts`

### Quick Fixes
```bash
# Restart service
gcloud run services update neon-agent --region=us-central1 --min-instances=0
gcloud run services update neon-agent --region=us-central1 --min-instances=1

# View detailed health
curl https://neon-agent-814485644774.us-central1.run.app/health/detailed

# Test query
curl -X POST https://neon-agent-814485644774.us-central1.run.app/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How many records are in the database?"}'
```

## 📝 Development

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run locally
python simple_server.py
```

### Testing
```bash
# Test health
curl http://localhost:8000/health

# Test query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Test query"}'
```

## 🔄 Updates

To update the service:
1. Modify `simple_server.py` or configuration
2. Run `./deploy-always-on.sh`
3. Monitor deployment with `./monitor-service.sh`
4. Update Angular service URL if needed

## 📞 Support

- Check logs: `gcloud run services logs tail neon-agent --region=us-central1`
- Monitor health: `./monitor-service.sh`
- Service console: https://console.cloud.google.com/run/detail/us-central1/neon-agent/metrics?project=fibreflow-73daf