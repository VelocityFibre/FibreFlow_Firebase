"""
FastAPI server for FibreFlow Neon Query Agent
Provides REST endpoints for natural language database queries
"""
import logging
import time
from typing import Optional, Dict, List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from agent import get_agent, process_question, FibreFlowQueryAgent
from config import settings, ALLOWED_ORIGINS
from database import initialize_database
import uvicorn

# Set up logging
logging.basicConfig(level=getattr(logging, settings.log_level.upper()))
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="FibreFlow Query Agent API",
    description="Natural language interface to FibreFlow database",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# Add CORS middleware for FibreFlow integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Request/Response Models
class QueryRequest(BaseModel):
    """Request model for natural language queries"""
    question: str = Field(..., min_length=1, max_length=1000, description="Natural language question")
    user_id: Optional[str] = Field(None, description="User identifier for logging")
    include_sql: bool = Field(False, description="Include generated SQL in response")
    include_metadata: bool = Field(False, description="Include execution metadata")

class QueryResponse(BaseModel):
    """Response model for query results"""
    success: bool = Field(..., description="Whether query was successful")
    answer: Optional[str] = Field(None, description="Natural language answer")
    sql_query: Optional[str] = Field(None, description="Generated SQL query (if requested)")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time: float = Field(..., description="Query execution time in seconds")
    metadata: Optional[Dict] = Field(None, description="Additional execution metadata")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    database_connected: bool = Field(..., description="Database connection status")
    agent_ready: bool = Field(..., description="Agent initialization status")
    uptime: float = Field(..., description="Service uptime in seconds")

class DatabaseInfoResponse(BaseModel):
    """Database information response"""
    connection_status: str
    whitelisted_tables: List[str]
    table_statistics: Dict
    schema_sample: str

class AgentStatsResponse(BaseModel):
    """Agent statistics response"""
    total_queries: int
    successful_queries: int
    success_rate: float
    recent_queries: List[Dict]
    recent_failures: List[Dict]
    average_execution_time: float


# Global state
startup_time = time.time()
agent_instance: Optional[FibreFlowQueryAgent] = None


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global agent_instance
    
    logger.info("Starting FibreFlow Query Agent API...")
    
    try:
        # Initialize database
        if not initialize_database():
            logger.warning("Database initialization failed, but continuing...")
        
        # Pre-initialize agent (if credentials are available)
        try:
            agent_instance = get_agent()
            logger.info("Agent pre-initialized successfully")
        except Exception as e:
            logger.warning(f"Agent pre-initialization failed (will initialize on first request): {e}")
            agent_instance = None
        
        logger.info("FibreFlow Query Agent API started successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise


# Dependency to get agent instance
def get_agent_instance() -> FibreFlowQueryAgent:
    """Dependency to get or create agent instance"""
    global agent_instance
    
    try:
        if agent_instance is None:
            logger.info("Creating agent instance on first request...")
            agent_instance = get_agent()
        
        return agent_instance
        
    except Exception as e:
        logger.error(f"Failed to get agent instance: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Agent not available: {str(e)}"
        )


# API Endpoints

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    global agent_instance
    
    try:
        # Check database connection
        database_connected = False
        try:
            from database import get_db
            db = get_db()
            database_connected = db.test_connection()
        except:
            pass
        
        # Check agent status
        agent_ready = agent_instance is not None
        
        return HealthResponse(
            status="healthy",
            version="1.0.0",
            database_connected=database_connected,
            agent_ready=agent_ready,
            uptime=time.time() - startup_time
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed"
        )


@app.post("/query", response_model=QueryResponse)
async def query_database(
    request: QueryRequest,
    agent: FibreFlowQueryAgent = Depends(get_agent_instance)
):
    """
    Process a natural language query against the FibreFlow database
    
    This endpoint accepts natural language questions and returns
    business-focused answers using the underlying database.
    """
    
    try:
        logger.info(f"Processing query: '{request.question[:50]}...' (user: {request.user_id or 'anonymous'})")
        
        # Process the query
        result = agent.query(request.question, request.user_id)
        
        # Build response
        response_data = {
            "success": result["success"],
            "answer": result.get("answer"),
            "execution_time": result["execution_time"],
            "error": result.get("error")
        }
        
        # Add optional fields based on request
        if request.include_sql and "metadata" in result:
            # In a real implementation, we'd need to capture the SQL from LangChain
            response_data["sql_query"] = "Generated SQL (requires LangChain callback integration)"
        
        if request.include_metadata:
            response_data["metadata"] = result.get("metadata", {})
        
        return QueryResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Query processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query processing failed: {str(e)}"
        )


@app.get("/database/info", response_model=DatabaseInfoResponse)
async def get_database_info(agent: FibreFlowQueryAgent = Depends(get_agent_instance)):
    """Get information about the connected database"""
    
    try:
        info = agent.get_database_info()
        
        if "error" in info:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=info["error"]
            )
        
        return DatabaseInfoResponse(**info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get database info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve database information"
        )


@app.get("/agent/stats", response_model=AgentStatsResponse)
async def get_agent_stats(agent: FibreFlowQueryAgent = Depends(get_agent_instance)):
    """Get agent performance statistics"""
    
    try:
        stats = agent.get_agent_stats()
        return AgentStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get agent stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve agent statistics"
        )


@app.post("/agent/test")
async def test_agent_functionality(agent: FibreFlowQueryAgent = Depends(get_agent_instance)):
    """Test basic agent functionality"""
    
    try:
        test_results = agent.test_basic_functionality()
        return test_results
        
    except Exception as e:
        logger.error(f"Agent test failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent test failed: {str(e)}"
        )


@app.get("/agent/history")
async def get_conversation_history(agent: FibreFlowQueryAgent = Depends(get_agent_instance)):
    """Get recent conversation history"""
    
    try:
        history = agent.get_conversation_history()
        return {"history": history}
        
    except Exception as e:
        logger.error(f"Failed to get conversation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation history"
        )


@app.delete("/agent/history")
async def clear_conversation_history(agent: FibreFlowQueryAgent = Depends(get_agent_instance)):
    """Clear conversation memory"""
    
    try:
        agent.clear_memory()
        return {"message": "Conversation history cleared"}
        
    except Exception as e:
        logger.error(f"Failed to clear conversation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear conversation history"
        )


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.debug else "An error occurred"
        }
    )


# Development endpoints (only in debug mode)
if settings.debug:
    
    @app.get("/debug/config")
    async def get_config():
        """Get current configuration (debug only)"""
        return {
            "environment": settings.environment,
            "debug": settings.debug,
            "whitelisted_tables": settings.whitelisted_tables,
            "max_query_results": settings.max_query_results,
            "api_port": settings.api_port
        }
    
    @app.get("/debug/security/recent-queries")
    async def get_recent_security_logs():
        """Get recent security logs (debug only)"""
        try:
            from security import get_security_manager
            manager = get_security_manager()
            recent = manager.auditor.get_recent_queries(20)
            failed = manager.auditor.get_failed_queries(10)
            
            return {
                "recent_queries": recent,
                "failed_queries": failed
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get security logs: {e}"
            )


def run_server():
    """Run the FastAPI server"""
    logger.info(f"Starting server on {settings.api_host}:{settings.api_port}")
    
    uvicorn.run(
        "api:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


if __name__ == "__main__":
    run_server()