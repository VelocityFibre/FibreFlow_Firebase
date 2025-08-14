#!/usr/bin/env python3
"""
Simple FastAPI server for Neon+Gemini integration
Works with FibreFlow Angular service
"""
import os
import time
import logging
import threading
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import uvicorn
import psycopg2
from psycopg2 import sql, pool
import json
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
import asyncio

# Load environment variables
load_dotenv('.env.local')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state for "always on" functionality
start_time = time.time()
db_pool = None
keep_alive_task = None
health_status = {
    "database_connected": False,
    "agent_ready": False,
    "uptime": 0,
    "last_health_check": time.time(),
    "connection_pool_status": "initializing"
}

async def startup_event():
    """Initialize connection pool and start keep-alive tasks"""
    global db_pool, keep_alive_task, health_status
    
    logger.info("🚀 Starting FibreFlow Neon+Gemini Agent")
    
    # Initialize database connection pool
    connection_string = os.getenv('NEON_CONNECTION_STRING')
    pool_size = int(os.getenv('CONNECTION_POOL_SIZE', '10'))
    
    if connection_string:
        try:
            # Create threaded connection pool
            db_pool = psycopg2.pool.ThreadedConnectionPool(
                1, pool_size,  # min/max connections
                connection_string,
                connect_timeout=10
            )
            health_status["database_connected"] = True
            health_status["connection_pool_status"] = f"active_{pool_size}"
            logger.info(f"✅ Database connection pool created (size: {pool_size})")
        except Exception as e:
            logger.error(f"❌ Failed to create database pool: {e}")
            health_status["connection_pool_status"] = f"error: {str(e)}"
    
    # Configure Gemini
    global model
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
    if api_key:
        try:
            genai.configure(api_key=api_key)
            # Test the connection
            model = genai.GenerativeModel('gemini-1.5-pro')
            test_response = model.generate_content("Test connection")
            health_status["agent_ready"] = True
            logger.info("✅ Gemini AI connected and ready")
        except Exception as e:
            logger.error(f"❌ Gemini AI connection failed: {e}")
            health_status["agent_ready"] = False
    
    # Start keep-alive background task
    if os.getenv('KEEP_ALIVE', 'false').lower() == 'true':
        keep_alive_task = asyncio.create_task(keep_alive_loop())
        logger.info("🔄 Keep-alive task started")

async def shutdown_event():
    """Cleanup resources"""
    global db_pool, keep_alive_task
    
    logger.info("🛑 Shutting down FibreFlow Neon+Gemini Agent")
    
    # Cancel keep-alive task
    if keep_alive_task:
        keep_alive_task.cancel()
        try:
            await keep_alive_task
        except asyncio.CancelledError:
            pass
    
    # Close database pool
    if db_pool:
        db_pool.closeall()
        logger.info("✅ Database connection pool closed")

async def keep_alive_loop():
    """Background task to keep connections alive and monitor health"""
    global health_status
    
    while True:
        try:
            # Update uptime
            health_status["uptime"] = int(time.time() - start_time)
            health_status["last_health_check"] = time.time()
            
            # Test database connection
            if db_pool:
                conn = None
                try:
                    conn = db_pool.getconn()
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1")
                    cursor.close()
                    health_status["database_connected"] = True
                    logger.debug("🟢 Database keep-alive successful")
                except Exception as e:
                    logger.warning(f"🟡 Database keep-alive failed: {e}")
                    health_status["database_connected"] = False
                finally:
                    if conn:
                        db_pool.putconn(conn)
            
            # Wait 30 seconds before next check
            await asyncio.sleep(30)
            
        except asyncio.CancelledError:
            logger.info("🛑 Keep-alive task cancelled")
            break
        except Exception as e:
            logger.error(f"❌ Keep-alive loop error: {e}")
            await asyncio.sleep(60)  # Wait longer on error

# Create FastAPI app with lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await startup_event()
    yield
    # Shutdown
    await shutdown_event()

app = FastAPI(
    title="FibreFlow Neon+Gemini Agent (Always On)",
    description="Always-available natural language interface for FibreFlow data with connection pooling",
    version="2.0.0",
    lifespan=lifespan
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

# Global Gemini model (configured in startup_event)
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

# Database connection helper with pool
def get_db_connection():
    """Get database connection from pool"""
    global db_pool
    if not db_pool:
        raise Exception("Database connection pool not available")
    return db_pool.getconn()

def return_db_connection(conn):
    """Return connection to pool"""
    global db_pool
    if db_pool and conn:
        db_pool.putconn(conn)

# Database schema information for SQL generation
DATABASE_SCHEMA = """
Available tables and columns:
1. status_changes - Main pole status tracking table
   - property_id (TEXT): Unique property identifier
   - pole_number (TEXT): Pole identifier (e.g., 'LAW.P.B167')
   - status (TEXT): Current status (e.g., 'Pole Permission: Approved')
   - agent_name (TEXT): Agent responsible for the pole
   - status_date (DATE): When status was recorded
   - address (TEXT): Property address
   - zone (TEXT): Area zone identifier

2. current_pole_statuses - Latest status per pole
   - pole_number (TEXT): Pole identifier
   - latest_status (TEXT): Most recent status
   - latest_date (DATE): Date of latest status
   - agent_name (TEXT): Current agent

3. status_history - Historical status changes
   - pole_number (TEXT): Pole identifier  
   - old_status (TEXT): Previous status
   - new_status (TEXT): New status
   - change_date (DATE): When change occurred
   
Business Context:
- Pole numbers like 'LAW.P.B167' represent Lawley project poles
- Common statuses: "Pole Permission: Approved", "Home Sign Ups: Approved", "Home Installation: Installed"
- Agent names are responsible technicians
- This is OneMap data from fiber optic installations
"""

# Note: Database connection testing now handled in startup_event()

def generate_sql_query(question: str) -> str:
    """Generate SQL query from natural language using Gemini"""
    if not model:
        raise Exception("Gemini model not available")
    
    prompt = f"""
You are an expert SQL query generator for a fiber optic project management database.
Generate a safe, read-only SELECT query for the following question.

Database Schema:
{DATABASE_SCHEMA}

Question: {question}

Requirements:
1. Only generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Use appropriate WHERE clauses to filter data
3. Include LIMIT clause if query might return many rows
4. Use proper PostgreSQL syntax
5. Return only the SQL query, no explanations

If the question cannot be answered with the available tables, respond with: "CANNOT_ANSWER"

SQL Query:"""

    response = model.generate_content(prompt)
    return response.text.strip()

def execute_safe_query(query: str) -> List[Dict[str, Any]]:
    """Execute query safely using connection pool"""
    # Security check - only allow SELECT queries
    query_upper = query.upper().strip()
    if not query_upper.startswith('SELECT'):
        raise Exception("Only SELECT queries are allowed")
    
    # Block dangerous keywords
    dangerous_keywords = ['DELETE', 'INSERT', 'UPDATE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE']
    for keyword in dangerous_keywords:
        if keyword in query_upper:
            raise Exception(f"Dangerous keyword '{keyword}' not allowed")
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        
        # Get column names
        columns = [desc[0] for desc in cursor.description]
        
        # Fetch results
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        results = []
        for row in rows:
            result_dict = {}
            for i, value in enumerate(row):
                # Handle different data types
                if hasattr(value, 'isoformat'):  # datetime objects
                    result_dict[columns[i]] = value.isoformat()
                else:
                    result_dict[columns[i]] = value
            results.append(result_dict)
        
        cursor.close()
        return results
    finally:
        if conn:
            return_db_connection(conn)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Enhanced health check endpoint"""
    global health_status
    
    # Update uptime
    health_status["uptime"] = int(time.time() - start_time)
    
    is_healthy = health_status["database_connected"] and health_status["agent_ready"]
    
    return HealthResponse(
        status="healthy" if is_healthy else "unhealthy",
        database_connected=health_status["database_connected"],
        agent_ready=health_status["agent_ready"],
        uptime=health_status["uptime"]
    )

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with connection pool status"""
    global health_status
    
    health_status["uptime"] = int(time.time() - start_time)
    
    # Test database pool if available
    pool_info = {}
    if db_pool:
        try:
            # Get pool statistics (simplified)
            pool_info = {
                "status": "active",
                "pool_size": f"{db_pool.minconn}-{db_pool.maxconn}",
                "connection_test": "passed"
            }
            # Quick connection test
            conn = None
            try:
                conn = db_pool.getconn()
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                pool_info["last_test"] = time.time()
            finally:
                if conn:
                    db_pool.putconn(conn)
        except Exception as e:
            pool_info = {
                "status": "error",
                "error": str(e),
                "last_test": time.time()
            }
    else:
        pool_info = {"status": "not_initialized"}
    
    return {
        **health_status,
        "connection_pool": pool_info,
        "gemini_status": "ready" if health_status["agent_ready"] else "not_configured",
        "server_info": {
            "version": "2.0.0",
            "keep_alive_enabled": os.getenv('KEEP_ALIVE', 'false').lower() == 'true',
            "pool_size": int(os.getenv('CONNECTION_POOL_SIZE', '10'))
        }
    }

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process natural language query using connection pool"""
    start = time.time()
    
    if not health_status["agent_ready"]:
        return QueryResponse(
            success=False,
            error="Gemini API not configured or not ready",
            execution_time=int((time.time() - start) * 1000)
        )
    
    if not health_status["database_connected"]:
        return QueryResponse(
            success=False,
            error="Database connection pool not available",
            execution_time=int((time.time() - start) * 1000)
        )
    
    try:
        # Step 1: Generate SQL query from natural language
        sql_query = generate_sql_query(request.question)
        
        # Check if query could not be generated
        if sql_query.strip() == "CANNOT_ANSWER":
            return QueryResponse(
                success=True,
                answer="I don't have enough information to answer that question based on the available data tables. Could you try asking about pole statuses, agent assignments, or project progress?",
                sql_query="",
                execution_time=int((time.time() - start) * 1000),
                metadata={
                    "llm_model": "gemini-1.5-pro",
                    "question": request.question,
                    "user_id": request.user_id,
                    "timestamp": int(time.time()),
                    "query_type": "unsupported"
                }
            )
        
        # Step 2: Execute the SQL query
        try:
            results = execute_safe_query(sql_query)
            
            # Step 3: Generate human-friendly response
            results_summary = f"Found {len(results)} results"
            if results:
                # Show first few results as example
                sample_results = results[:3]
                results_text = json.dumps(sample_results, indent=2)
                if len(results) > 3:
                    results_text += f"\n... and {len(results) - 3} more results"
            else:
                results_text = "No results found"
            
            # Generate natural language answer
            interpretation_prompt = f"""
Based on the SQL query results for FibreFlow fiber optic data, provide a clear business-focused summary.

Original question: {request.question}
SQL executed: {sql_query}
Results: {results_summary}

Sample data: {results_text}

Provide a helpful interpretation of these results in business terms.
Focus on insights relevant to fiber optic project management.
"""
            
            interpretation = model.generate_content(interpretation_prompt)
            
            return QueryResponse(
                success=True,
                answer=interpretation.text,
                sql_query=sql_query if request.include_sql else "",
                execution_time=int((time.time() - start) * 1000),
                metadata={
                    "llm_model": "gemini-1.5-pro",
                    "question": request.question,
                    "user_id": request.user_id,
                    "timestamp": int(time.time()),
                    "results_count": len(results),
                    "query_type": "database"
                }
            )
            
        except Exception as sql_error:
            # If SQL execution fails, provide fallback response
            fallback_prompt = f"""
I tried to query the FibreFlow database for: "{request.question}"

Generated query: {sql_query}
Error: {str(sql_error)}

Please provide a helpful response explaining what went wrong and suggest how the user might rephrase their question.
"""
            fallback_response = model.generate_content(fallback_prompt)
            
            return QueryResponse(
                success=False,
                answer=fallback_response.text,
                sql_query=sql_query if request.include_sql else "",
                error=f"SQL execution failed: {str(sql_error)}",
                execution_time=int((time.time() - start) * 1000),
                metadata={
                    "llm_model": "gemini-1.5-pro",
                    "question": request.question,
                    "user_id": request.user_id,
                    "timestamp": int(time.time()),
                    "query_type": "failed_sql"
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
    """Database information endpoint using connection pool"""
    if not health_status["database_connected"]:
        return {
            "connection_status": "disconnected",
            "error": "Database connection pool not available",
            "llm_model": "gemini-1.5-pro",
            "pool_status": health_status.get("connection_pool_status", "unknown")
        }
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get table information
        cursor.execute("""
            SELECT 
                table_name,
                pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY pg_total_relation_size(table_schema||'.'||table_name) DESC
        """)
        tables = cursor.fetchall()
        
        # Get row counts for key tables
        table_stats = {}
        key_tables = ['status_changes', 'current_pole_statuses', 'status_history']
        for table_name in key_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                table_stats[table_name] = count
            except:
                pass  # Table might not exist
        
        # Get database version
        cursor.execute("SELECT version()")
        db_version = cursor.fetchone()[0]
        
        cursor.close()
        
        return {
            "connection_status": "connected",
            "database_version": db_version.split(' ')[1],  # Extract version number
            "tables": [{"name": name, "size": size} for name, size in tables],
            "table_statistics": table_stats,
            "total_tables": len(tables),
            "llm_model": "gemini-1.5-pro",
            "schema_available": True,
            "connection_pool": health_status.get("connection_pool_status", "unknown"),
            "supported_queries": [
                "Pole status information",
                "Agent assignments", 
                "Status change history",
                "Project progress tracking"
            ]
        }
        
    except Exception as e:
        return {
            "connection_status": "error", 
            "error": str(e),
            "llm_model": "gemini-1.5-pro",
            "pool_status": health_status.get("connection_pool_status", "unknown")
        }
    finally:
        if conn:
            return_db_connection(conn)

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
    print("🚀 Starting FibreFlow Neon+Gemini Agent")
    print("=" * 50)
    print(f"📱 API Server: http://localhost:8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"🤖 LLM Model: {'✅ Gemini 1.5 Pro' if model else '❌ Not configured'}")
    print(f"🗄️  Database: {'✅ Neon PostgreSQL' if db_connected else '❌ Not connected'}")
    print("🔗 Angular service will connect automatically")
    
    if db_connected and model:
        print("\n🎉 Ready to answer natural language queries about FibreFlow data!")
        print("\n💡 Example queries you can ask:")
        print("   • How many poles are approved in Lawley?")
        print("   • Which agent has the most installations?") 
        print("   • What's the status of pole LAW.P.B167?")
        print("   • Show me poles with pending permissions")
    elif not db_connected:
        print("\n⚠️  Database connection failed - check .env.local configuration")
    elif not model:
        print("\n⚠️  Gemini API not configured - check GOOGLE_AI_STUDIO_API_KEY")
    
    print("\n" + "=" * 50)
    
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)