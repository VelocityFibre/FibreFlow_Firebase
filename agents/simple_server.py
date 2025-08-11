#!/usr/bin/env python3
"""
Simple FastAPI server for Neon+Gemini integration
Works with FibreFlow Angular service
"""
import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import uvicorn

# Load environment variables
load_dotenv('.env.local')

# Create FastAPI app
app = FastAPI(
    title="FibreFlow Neon+Gemini Agent",
    description="Simple natural language interface for FibreFlow data",
    version="1.0.0"
)

# Add CORS for FibreFlow Angular app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "https://fibreflow-73daf.web.app",
        "https://fibreflow.web.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro')
else:
    model = None

# Request/Response Models
class QueryRequest(BaseModel):
    question: str
    user_id: str = "anonymous"
    include_metadata: bool = True
    include_sql: bool = False

class QueryResponse(BaseModel):
    success: bool
    answer: str = ""
    sql_query: str = ""
    error: str = ""
    execution_time: int
    metadata: dict = {}

class HealthResponse(BaseModel):
    status: str
    version: str = "1.0.0"
    database_connected: bool
    agent_ready: bool
    uptime: int

# Global state
start_time = time.time()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if model else "unhealthy",
        database_connected=False,  # Would check Neon connection in real implementation
        agent_ready=model is not None,
        uptime=int(time.time() - start_time)
    )

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process natural language query"""
    start = time.time()
    
    if not model:
        return QueryResponse(
            success=False,
            error="Gemini API not configured",
            execution_time=int((time.time() - start) * 1000)
        )
    
    try:
        # Create a context-aware prompt for FibreFlow
        context_prompt = f"""
You are a data analyst for FibreFlow, a fiber optic project management system. 
You have access to data about poles, drops, installations, and project status.

Sample data context:
- The system tracks fiber optic pole installations
- Pole numbers follow format like 'LAW.P.B167' (Location.P.Block.Number)
- Common statuses include "Pole Permission: Approved", "Home Sign Ups: Approved", "Home Installation: Installed"
- The main data comes from OneMap integration with 15,000+ records
- Lawley project has approximately 3,757 poles planted (98% completion)

User question: "{request.question}"

Provide a helpful, business-focused answer. If this seems like a data query that would need database access, 
mention that this is a demo mode and suggest what the actual query might look like.
"""

        response = model.generate_content(context_prompt)
        
        return QueryResponse(
            success=True,
            answer=response.text,
            execution_time=int((time.time() - start) * 1000),
            metadata={
                "llm_model": "gemini-1.5-pro",
                "question": request.question,
                "user_id": request.user_id,
                "timestamp": int(time.time()),
                "demo_mode": True
            }
        )
        
    except Exception as e:
        return QueryResponse(
            success=False,
            error=f"Query processing failed: {str(e)}",
            execution_time=int((time.time() - start) * 1000)
        )

@app.get("/database/info")
async def database_info():
    """Database information endpoint"""
    return {
        "connection_status": "demo_mode",
        "whitelisted_tables": ["status_changes", "projects", "poles", "contractors"],
        "table_statistics": {
            "status_changes": 15651,
            "projects": 2,
            "poles": 3757
        },
        "schema_sample": "Demo mode - real database would show actual schema",
        "llm_model": "gemini-1.5-pro"
    }

@app.get("/agent/stats")
async def agent_stats():
    """Agent statistics endpoint"""
    return {
        "total_queries": 0,
        "successful_queries": 0,
        "success_rate": 100,
        "recent_queries": [],
        "recent_failures": [],
        "average_execution_time": 0
    }

@app.post("/agent/test")
async def test_agent():
    """Test agent functionality"""
    if not model:
        return {"error": "Gemini not available"}
    
    try:
        test_response = model.generate_content("Test: Respond with 'Agent working!' if you can see this.")
        return {
            "total_tests": 1,
            "successful_tests": 1,
            "success_rate": 100,
            "results": [{"test": "basic_response", "result": test_response.text}]
        }
    except Exception as e:
        return {
            "total_tests": 1,
            "successful_tests": 0,
            "success_rate": 0,
            "results": [{"test": "basic_response", "error": str(e)}]
        }

@app.delete("/agent/history")
async def clear_history():
    """Clear conversation history"""
    return {"message": "History cleared (demo mode)"}

@app.get("/agent/history")
async def get_history():
    """Get conversation history"""
    return {"history": []}

if __name__ == "__main__":
    print("🚀 Starting FibreFlow Neon+Gemini Agent (Simple Mode)")
    print("🔗 Angular service will connect to: http://localhost:8000")
    print("📱 API docs available at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)