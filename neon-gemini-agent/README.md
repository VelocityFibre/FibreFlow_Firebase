# Neon + Gemini Agent for FibreFlow

A natural language interface for querying FibreFlow's Neon PostgreSQL database using Google's Gemini AI.

## 🚀 Features

- **Natural Language Queries**: Ask questions in plain English about your fiber optic data
- **AI-Powered SQL Generation**: Gemini converts your questions to optimized SQL queries
- **Intelligent Result Interpretation**: Get human-readable summaries of query results
- **Interactive Mode**: Continuous Q&A session for data exploration
- **Secure Connection**: Connects to your existing Neon database with SSL

## 📋 Prerequisites

- Node.js 18+ installed on your laptop
- Access to FibreFlow's Neon database (connection string)
- Google AI Studio API key (free tier: 50 requests/day)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
# Clone the FibreFlow repository
git clone [your-repo-url]
cd FibreFlow

# Checkout the neon-gemini-agent branch
git checkout neon-gemini-agent

# Navigate to the agent directory
cd neon-gemini-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the environment template
cp config/.env.template config/.env

# Edit the configuration file
nano config/.env
```

Add your credentials:
```env
# Neon Database URL (from your Neon dashboard)
NEON_DATABASE_URL=postgresql://neondb_owner:[password]@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require

# Gemini API Key (from Google AI Studio)
GEMINI_API_KEY=AIza...your_key_here
```

### 4. Test Connection

```bash
npm test
```

## 🎯 Usage

### Interactive Mode (Recommended)

Start an interactive session where you can ask multiple questions:

```bash
npm start
# or
node scripts/neon-gemini-query.js
```

Example session:
```
🤖 Neon + Gemini Agent - Interactive Mode
Ask questions about your FibreFlow data in natural language.
Type "exit" to quit.

Your question: How many poles were installed last month?

🔍 Processing your question...

📊 Answer:
In the last month (January 2025), there were 287 poles installed across 
all projects. The breakdown by status:
- Completed: 234 poles
- In Progress: 43 poles  
- Pending: 10 poles

The majority of installations were in the Lawley area (156 poles) 
followed by Mohadin (131 poles).

================================================================================

Your question: Show me the top 5 contractors by number of poles installed

🔍 Processing your question...
```

### Single Query Mode

Ask a single question and get an answer:

```bash
node scripts/neon-gemini-query.js "What is the average installation time per pole?"
```

## 📊 Example Questions

Here are some questions you can ask:

**Installation Metrics:**
- "How many poles were installed last week?"
- "What's the average installation time per pole?"
- "Which areas have the most pending installations?"

**Contractor Performance:**
- "Show me the top contractors by completion rate"
- "Which contractor has the fastest installation times?"
- "How many poles has contractor ABC installed this month?"

**Status Tracking:**
- "How many poles are pending approval?"
- "Show me all installations with issues"
- "What percentage of poles passed QA on first inspection?"

**Geographic Analysis:**
- "Which zones have the most installations?"
- "Show me poles installed in Lawley area"
- "What's the coverage percentage by zone?"

**Time-based Analysis:**
- "Compare this month's installations to last month"
- "Show me the installation trend over the last 6 months"
- "What are the peak installation days?"

## 🔧 Advanced Configuration

### Database Schema Context

The agent understands the following tables:
- `onemap_status_changes` - Status change tracking
- `sow_poles` - Pole installation data
- `sow_drops` - Customer connections
- `import_batches` - Data import history

### Performance Tuning

Adjust in your `.env` file:
```env
DB_MAX_CONNECTIONS=10      # Connection pool size
DB_IDLE_TIMEOUT_MS=30000   # Connection timeout
GEMINI_MAX_TOKENS=8192     # Max response length
```

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test database connection
node tests/test-connection.js

# Common fixes:
# 1. Check your NEON_DATABASE_URL includes ?sslmode=require
# 2. Ensure your IP is whitelisted in Neon dashboard
# 3. Verify the password doesn't contain special characters that need escaping
```

### API Key Issues
```bash
# Verify Gemini API key
node tests/test-gemini.js

# Get a new key from:
# https://aistudio.google.com/apikey
```

### Query Errors
- If SQL generation fails, try rephrasing your question
- Be specific about time ranges (e.g., "last 7 days" vs "recently")
- Specify limits when asking for lists (e.g., "top 10" vs "all")

## 🚀 Deployment Options

### Option 1: Local Development
Run directly on your laptop with full access to the database.

### Option 2: Docker Container
```bash
docker build -t neon-gemini-agent .
docker run -it --env-file config/.env neon-gemini-agent
```

### Option 3: Cloud Function
Deploy as a Firebase Function for team access (see `functions/` directory).

## 📈 Usage Limits

- **Gemini Free Tier**: 50 requests/day
- **Neon Free Tier**: 100k requests/month
- **Recommended**: Cache frequent queries to stay within limits

## 🔒 Security Notes

- Never commit your `.env` file
- Use read-only database credentials when possible
- Gemini doesn't see your actual data, only schemas and results
- All connections use SSL encryption

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Google AI Studio](https://aistudio.google.com)
- [FibreFlow Main Documentation](../README.md)

## 🤝 Contributing

1. Create feature branch from `neon-gemini-agent`
2. Test your changes thoroughly
3. Update documentation if needed
4. Submit pull request

## 📝 License

Part of the FibreFlow project - see main LICENSE file.