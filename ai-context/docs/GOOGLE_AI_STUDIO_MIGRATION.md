# Migrating from Vertex AI to Google AI Studio

## 🎯 Why Switch?

### Cost Comparison
| Feature | Vertex AI | Google AI Studio |
|---------|-----------|------------------|
| **Setup** | Complex (IAM, billing) | Simple (just API key) |
| **Free Tier** | None | 50 requests/day |
| **Input Cost** | $3.50-7/million | $0 (free) or $0.15/million |
| **Output Cost** | $10.50-21/million | $0 (free) or $0.60/million |
| **Monthly Cost** | $40-80 | $0-10 |
| **Same Models** | ✅ Gemini 1.5 Pro/Flash | ✅ Gemini 1.5 Pro/Flash |
| **Context Window** | 1M tokens | 1M tokens |

### Bottom Line
- **Same powerful Gemini models**
- **90% cheaper or FREE**
- **Simpler setup**

## 🚀 Quick Migration

### 1. Get API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key

### 2. Run Setup Script
```bash
cd vertex
python scripts/setup_google_ai_studio.py
```

### 3. Update Your Workflow
```bash
# Old (Vertex AI)
python cli/vertex_cli.py enhance "request"

# New (Google AI Studio) - same command!
python cli/vertex_cli.py enhance "request"
```

## 📝 Code Changes

### Before (Vertex AI)
```python
from google.cloud import aiplatform
from vertexai.language_models import TextGenerationModel

aiplatform.init(project='project-id', location='us-central1')
model = TextGenerationModel.from_pretrained("text-bison@002")
response = model.predict(prompt)
```

### After (Google AI Studio)
```python
import google.generativeai as genai

genai.configure(api_key='your-api-key')
model = genai.GenerativeModel('gemini-1.5-pro')
response = model.generate_content(prompt)
```

## 🎨 Updated Architecture

```
┌─────────────────────────────────────┐
│         Your Request                │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│     FibreFlow Context Engine        │
│   (Our code - unchanged)            │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Google AI Studio API             │
│   (Simple API key auth)             │
│   genai.GenerativeModel()           │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    Gemini 1.5 Pro Response          │
│   (Same model, same quality)        │
└─────────────────────────────────────┘
```

## 💰 Free Tier Details

### Limits
- **Requests**: 50 per day
- **Context**: 1M tokens per request
- **Models**: Both Pro and Flash available
- **Rate Limit**: 1 request per second

### Usage Tracking
```python
# Automatic tracking in our code
cache/daily_usage.json
{
  "2025-01-30": 23,  // 23/50 used today
  "2025-01-31": 0
}
```

### When You Hit Limits
- Automatic fallback to pattern matching
- Or upgrade to paid tier ($0.15/million tokens)
- Or wait until tomorrow (resets daily)

## 🔧 Environment Variables

### Required
```bash
# .env.local
GOOGLE_AI_STUDIO_API_KEY=your-api-key-here
```

### Optional
```bash
# Model selection
GEMINI_MODEL=gemini-1.5-pro  # or gemini-1.5-flash

# Free tier management
DAILY_REQUEST_LIMIT=50
CACHE_ENABLED=true
CACHE_TTL=3600
```

## 📊 When to Use Each Model

### Gemini 1.5 Pro
- Complex analysis
- Architecture decisions
- Code generation
- **Cost**: Higher but still cheap

### Gemini 1.5 Flash
- Quick queries
- Simple enhancements
- Pattern matching
- **Cost**: 95% cheaper than Pro

## 🚨 Important Notes

1. **API Key Security**
   - Never commit to git
   - Keep in .env.local
   - Regenerate if exposed

2. **Rate Limits**
   - Free: 1 request/second
   - Paid: 5 requests/second

3. **Quota Resets**
   - Daily at midnight Pacific Time
   - No rollover of unused requests

## 🎯 Migration Checklist

- [ ] Get API key from AI Studio
- [ ] Run setup script
- [ ] Test with simple query
- [ ] Update .env.local
- [ ] Remove Vertex AI credentials (optional)
- [ ] Update team documentation

## 💡 Pro Tips

1. **Use Free Tier Wisely**
   - Complex tasks in morning
   - Simple queries later
   - Cache everything

2. **Optimize Prompts**
   - Shorter prompts = more requests
   - Use caching aggressively

3. **Monitor Usage**
   ```bash
   cat cache/daily_usage.json
   ```

## 🔄 Rollback Plan

If you need to switch back to Vertex AI:
1. Keep Vertex credentials in .env.local
2. Change import in prompt_enhancer.py
3. No other changes needed

---

**Summary**: Same Gemini power, 90% cost reduction, simpler setup. The migration takes 5 minutes and saves $40-70/month!