# FibreFlow Neon Query Agent - Project Development Plan (PDP)

## 📋 Project Overview

**Project**: AI Agent for Natural Language Database Querying  
**Duration**: 16 days (3 phases)  
**Start Date**: 2025-08-13  
**Framework**: LangChain SQL Agent + Neon Postgres  
**Goal**: Enable users to query FibreFlow database using natural language

---

## 🎯 Phase 1: Foundation & Agent Setup
**Duration**: Days 1-5 (5 days)  
**Status**: 🟡 Pending

### Stage 1.1: Environment & Project Setup
**Duration**: Day 1  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Python virtual environment created
- [ ] Project directory structure established
- [ ] Dependencies installed (langchain, psycopg2, fastapi, etc.)
- [ ] `.env.local` configured with API keys and database credentials

#### Tasks:
```bash
# 1. Create environment
cd agents/
python -m venv venv
source venv/bin/activate

# 2. Create project structure
mkdir -p {src,tests,examples,docs}
touch src/__init__.py

# 3. Install dependencies
pip install langchain langchain-community langchain-openai
pip install psycopg2-binary fastapi streamlit redis
pip install python-dotenv pytest

# 4. Create requirements.txt
pip freeze > requirements.txt
```

#### Acceptance Criteria:
- ✅ Virtual environment activated successfully
- ✅ All dependencies installed without errors
- ✅ Project structure matches specification
- ✅ Environment variables can be loaded

---

### Stage 1.2: Database Connection & Security Setup
**Duration**: Days 2-3  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Neon database read-only user created (`ai_agent`)
- [ ] Database connection module implemented
- [ ] Table whitelist configured (projects, tasks, contractors, boq_items)
- [ ] Connection tested and validated

#### Tasks:
```sql
-- 1. Create read-only user in Neon database
CREATE USER ai_agent WITH PASSWORD 'secure_random_password_123';
GRANT CONNECT ON DATABASE fibreflow TO ai_agent;
GRANT USAGE ON SCHEMA public TO ai_agent;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_agent;

-- 2. Enable Row Level Security (basic setup)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_agent_policy ON projects 
  FOR SELECT TO ai_agent 
  USING (status != 'confidential');
```

```python
# 3. Implement database connection
# src/database.py
from langchain_community.utilities import SQLDatabase
import os

class NeonConnection:
    def __init__(self):
        self.connection_string = os.getenv('NEON_CONNECTION_STRING')
        self.whitelisted_tables = [
            'projects', 'tasks', 'contractors', 'boq_items',
            'staff', 'daily_progress', 'stock_items'
        ]
    
    def get_database(self):
        return SQLDatabase.from_uri(
            self.connection_string,
            include_tables=self.whitelisted_tables
        )
```

#### Acceptance Criteria:
- ✅ `ai_agent` user can connect to database
- ✅ User can only SELECT from whitelisted tables
- ✅ Row-level security prevents access to confidential data
- ✅ Database connection module works in isolation

---

### Stage 1.3: Basic LangChain Agent Implementation
**Duration**: Days 4-5  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Basic SQL agent using `create_sql_agent`
- [ ] Simple query processing functionality
- [ ] Error handling and logging
- [ ] Basic test queries working

#### Tasks:
```python
# src/agent.py
from langchain_community.agent_toolkits import create_sql_agent
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from .database import NeonConnection

class FibreFlowQueryAgent:
    def __init__(self):
        self.db = NeonConnection().get_database()
        self.llm = ChatOpenAI(
            model="gpt-4-turbo",
            temperature=0
        )
        self.memory = ConversationBufferMemory()
        
        self.agent = create_sql_agent(
            llm=self.llm,
            db=self.db,
            agent_type="openai-tools",
            verbose=True,
            memory=self.memory,
            max_iterations=3
        )
    
    def query(self, question: str) -> dict:
        try:
            result = self.agent.run(question)
            return {
                "success": True,
                "answer": result,
                "question": question
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "question": question
            }
```

#### Test Queries:
```python
# Basic test scenarios
test_queries = [
    "How many projects do we have?",
    "List all active projects",
    "Which contractor has the most projects?",
    "What's the average project duration?"
]
```

#### Acceptance Criteria:
- ✅ Agent can answer basic counting queries
- ✅ Agent can perform simple JOINs across tables
- ✅ Error handling works for invalid queries
- ✅ Responses are in natural language format

---

## 🔒 Phase 2: Security & Advanced Features
**Duration**: Days 6-11 (6 days)  
**Status**: 🟡 Pending

### Stage 2.1: Enhanced Security Implementation
**Duration**: Days 6-7  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Neon database branching for query sandboxing
- [ ] Enhanced Row-Level Security policies
- [ ] Query validation and sanitization
- [ ] Audit logging for all queries

#### Tasks:
```python
# src/security.py
from neon_api import NeonAPI
import hashlib
import datetime

class QuerySandbox:
    def __init__(self):
        self.neon_api = NeonAPI(api_key=os.getenv('NEON_API_KEY'))
    
    def create_sandbox_branch(self, query_hash: str):
        """Create isolated branch for query execution"""
        branch_name = f"query-sandbox-{query_hash[:8]}"
        
        return self.neon_api.create_branch(
            project_id=os.getenv('NEON_PROJECT_ID'),
            parent_branch="main",
            name=branch_name
        )
    
    def cleanup_sandbox(self, branch_id: str):
        """Clean up sandbox branch after query"""
        self.neon_api.delete_branch(branch_id)

class QueryValidator:
    FORBIDDEN_PATTERNS = [
        r'DROP\s+TABLE',
        r'DELETE\s+FROM',
        r'TRUNCATE\s+TABLE',
        r'UPDATE\s+.*SET',
        r'INSERT\s+INTO'
    ]
    
    @classmethod
    def is_safe_query(cls, query: str) -> tuple[bool, str]:
        import re
        query_upper = query.upper()
        
        for pattern in cls.FORBIDDEN_PATTERNS:
            if re.search(pattern, query_upper):
                return False, f"Forbidden operation detected: {pattern}"
        
        return True, "Query is safe"
```

#### Acceptance Criteria:
- ✅ Queries execute in isolated sandbox branches
- ✅ Forbidden operations are blocked
- ✅ All queries are logged with timestamps
- ✅ Sandbox branches are cleaned up automatically

---

### Stage 2.2: Vector Search Integration
**Duration**: Days 8-9  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] pgvector extension enabled in Neon
- [ ] Semantic search for similar queries
- [ ] Query context improvement system
- [ ] Embedding storage and retrieval

#### Tasks:
```sql
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create table for query embeddings
CREATE TABLE query_history (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    sql_query TEXT NOT NULL,
    result_summary TEXT,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE
);

-- 3. Create index for similarity search
CREATE INDEX ON query_history USING ivfflat (embedding vector_cosine_ops);
```

```python
# src/semantic_search.py
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings

class SemanticQuerySearch:
    def __init__(self, connection_string):
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = PGVector(
            collection_name="query_history",
            connection_string=connection_string,
            embedding_function=self.embeddings
        )
    
    def find_similar_queries(self, question: str, k: int = 3):
        """Find similar past queries for context"""
        return self.vector_store.similarity_search(question, k=k)
    
    def store_query(self, question: str, sql_query: str, result: str):
        """Store successful query for future reference"""
        self.vector_store.add_texts([question], metadatas=[{
            "sql_query": sql_query,
            "result_summary": result[:500]  # Truncate long results
        }])
```

#### Acceptance Criteria:
- ✅ Similar queries are found and used for context
- ✅ Query accuracy improves with semantic search
- ✅ Embeddings are stored and retrieved efficiently
- ✅ System learns from successful queries

---

### Stage 2.3: Caching & Performance Optimization
**Duration**: Days 10-11  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Redis caching for query results
- [ ] Query optimization strategies
- [ ] Response time monitoring
- [ ] Cost tracking for LLM usage

#### Tasks:
```python
# src/cache.py
import redis
import json
import hashlib

class QueryCache:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=6379,
            decode_responses=True
        )
        self.ttl = 3600  # 1 hour cache
    
    def get_cached_result(self, question: str):
        """Get cached result for identical question"""
        key = self._generate_key(question)
        cached = self.redis_client.get(key)
        return json.loads(cached) if cached else None
    
    def cache_result(self, question: str, result: dict):
        """Cache successful query result"""
        key = self._generate_key(question)
        self.redis_client.setex(
            key, 
            self.ttl, 
            json.dumps(result)
        )
    
    def _generate_key(self, question: str) -> str:
        return f"query:{hashlib.md5(question.encode()).hexdigest()}"
```

#### Acceptance Criteria:
- ✅ Identical queries return cached results instantly
- ✅ Cache hit rate is monitored and >30%
- ✅ LLM usage costs reduced by caching
- ✅ System responds in <2 seconds for cached queries

---

## 🚀 Phase 3: Testing, Optimization & Deployment
**Duration**: Days 12-16 (5 days)  
**Status**: 🟡 Pending

### Stage 3.1: Comprehensive Testing
**Duration**: Days 12-13  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Test suite for all functionality
- [ ] Performance benchmarking
- [ ] Security penetration testing
- [ ] User acceptance test scenarios

#### Tasks:
```python
# tests/test_agent.py
import pytest
from src.agent import FibreFlowQueryAgent

class TestFibreFlowAgent:
    def setup_method(self):
        self.agent = FibreFlowQueryAgent()
    
    def test_basic_queries(self):
        """Test basic counting and listing queries"""
        queries = [
            "How many projects do we have?",
            "List all contractors",
            "What's the total BOQ value?"
        ]
        
        for query in queries:
            result = self.agent.query(query)
            assert result["success"] == True
            assert len(result["answer"]) > 0
    
    def test_complex_queries(self):
        """Test multi-table JOINs and aggregations"""
        complex_queries = [
            "Which contractor has completed the most projects?",
            "Show project progress by region",
            "Compare task completion rates by team"
        ]
        
        for query in complex_queries:
            result = self.agent.query(query)
            assert result["success"] == True
    
    def test_security_blocks_dangerous_queries(self):
        """Ensure dangerous queries are blocked"""
        dangerous_queries = [
            "DROP TABLE projects",
            "DELETE FROM contractors",
            "UPDATE projects SET status = 'deleted'"
        ]
        
        for query in dangerous_queries:
            result = self.agent.query(query)
            assert result["success"] == False
            assert "forbidden" in result["error"].lower()
```

#### Performance Benchmarks:
- Response time: <3 seconds for simple queries
- Response time: <10 seconds for complex queries
- Cache hit rate: >30%
- Accuracy: >90% correct SQL generation

#### Acceptance Criteria:
- ✅ All test cases pass
- ✅ Performance meets benchmarks
- ✅ Security tests confirm protection
- ✅ User acceptance scenarios validated

---

### Stage 3.2: API & UI Development
**Duration**: Day 14  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] FastAPI endpoints for query processing
- [ ] Streamlit UI for testing and demos
- [ ] API documentation
- [ ] Authentication integration

#### Tasks:
```python
# src/api.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from .agent import FibreFlowQueryAgent

app = FastAPI(title="FibreFlow Query Agent API")

class QueryRequest(BaseModel):
    question: str
    user_id: str = None
    include_sql: bool = False

class QueryResponse(BaseModel):
    success: bool
    answer: str = None
    sql_query: str = None
    error: str = None
    response_time: float

@app.post("/query", response_model=QueryResponse)
async def query_database(request: QueryRequest):
    import time
    start_time = time.time()
    
    try:
        agent = FibreFlowQueryAgent()
        result = agent.query(request.question)
        
        response_time = time.time() - start_time
        
        return QueryResponse(
            success=result["success"],
            answer=result.get("answer"),
            sql_query=result.get("sql_query") if request.include_sql else None,
            error=result.get("error"),
            response_time=response_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
```

```python
# src/ui.py
import streamlit as st
import requests

st.set_page_config(
    page_title="FibreFlow Data Assistant",
    page_icon="🤖",
    layout="wide"
)

st.title("🤖 FibreFlow Data Assistant")
st.markdown("Ask questions about your FibreFlow data in natural language")

# Sidebar with example queries
st.sidebar.header("Example Questions")
examples = [
    "How many active projects do we have?",
    "Which contractor has the most projects?",
    "Show me overdue tasks by project",
    "What's our average project completion time?",
    "List all high-priority BOQ items"
]

for example in examples:
    if st.sidebar.button(example):
        st.session_state.question = example

# Main interface
question = st.text_input(
    "Ask your question:",
    value=st.session_state.get('question', ''),
    placeholder="e.g., How many projects are behind schedule?"
)

if st.button("Submit", type="primary"):
    if question:
        with st.spinner("Thinking..."):
            try:
                response = requests.post(
                    "http://localhost:8000/query",
                    json={"question": question, "include_sql": True}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data["success"]:
                        st.success("✅ Query successful!")
                        st.write("**Answer:**")
                        st.write(data["answer"])
                        
                        with st.expander("View Generated SQL"):
                            st.code(data.get("sql_query", "Not available"), language="sql")
                        
                        st.caption(f"Response time: {data['response_time']:.2f}s")
                    else:
                        st.error("❌ Query failed")
                        st.error(data["error"])
                else:
                    st.error("❌ API error")
            except Exception as e:
                st.error(f"❌ Connection error: {e}")
    else:
        st.warning("Please enter a question")
```

#### Acceptance Criteria:
- ✅ API endpoints respond correctly
- ✅ Streamlit UI is intuitive and responsive
- ✅ Authentication works with Firebase
- ✅ API documentation is complete

---

### Stage 3.3: Deployment & Production Setup
**Duration**: Days 15-16  
**Status**: ⬜ Not Started

#### Deliverables:
- [ ] Docker containerization
- [ ] Environment configuration for production
- [ ] Monitoring and logging setup
- [ ] Deployment to cloud platform

#### Tasks:
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY .env.local .

EXPOSE 8000

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NEON_CONNECTION_STRING=${NEON_CONNECTION_STRING}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_HOST=redis
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  ui:
    build: 
      context: .
      dockerfile: Dockerfile.streamlit
    ports:
      - "8501:8501"
    depends_on:
      - api
```

#### Acceptance Criteria:
- ✅ Application runs in Docker containers
- ✅ Environment variables are properly configured
- ✅ Monitoring shows system health
- ✅ Application is accessible from public URL

---

## 📊 Progress Tracking

### Phase Completion Status
- **Phase 1** (Foundation): ⬜ 0% Complete
- **Phase 2** (Security & Features): ⬜ 0% Complete  
- **Phase 3** (Testing & Deployment): ⬜ 0% Complete

### Overall Project Progress: 0%

### Key Metrics to Track
- [ ] Query accuracy rate (target: >90%)
- [ ] Response time (target: <3s simple, <10s complex)
- [ ] Cache hit rate (target: >30%)
- [ ] Test coverage (target: >80%)
- [ ] User satisfaction (target: >4/5 stars)

---

## 🚀 Getting Started

To begin Phase 1, run:
```bash
# Navigate to agents directory
cd /home/ldp/VF/Apps/FibreFlow/agents/

# Start with Stage 1.1: Environment Setup
python -m venv venv
source venv/bin/activate
```

Then follow the detailed tasks in Stage 1.1 above.

---

## 📝 Notes

- Update this PDP as stages are completed
- Mark tasks as ✅ when finished
- Add any blockers or issues encountered
- Adjust timelines if needed based on complexity

**Next Action**: Begin Phase 1, Stage 1.1 - Environment & Project Setup