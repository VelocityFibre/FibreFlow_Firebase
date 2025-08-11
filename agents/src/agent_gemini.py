"""
FibreFlow Neon Query Agent - Gemini AI Implementation
Uses Google Gemini instead of OpenAI for natural language to SQL conversion
"""
import logging
import time
from typing import Dict, Optional, List
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.agent_toolkits import create_sql_agent
from langchain.memory import ConversationBufferMemory
from langchain.callbacks.base import BaseCallbackHandler
from database import get_db, NeonConnection
from security import get_security_manager, SecurityManager
from config import settings
import json
import os

logger = logging.getLogger(__name__)


class GeminiQueryCallbackHandler(BaseCallbackHandler):
    """Custom callback handler to track query execution with Gemini"""
    
    def __init__(self):
        self.query_start_time = None
        self.query_metadata = {}
    
    def on_tool_start(self, serialized: Dict, input_str: str, **kwargs):
        """Called when SQL query tool starts"""
        if "sql" in serialized.get("name", "").lower():
            self.query_start_time = time.time()
            logger.info(f"Starting SQL query execution: {input_str[:100]}...")
    
    def on_tool_end(self, output: str, **kwargs):
        """Called when SQL query tool ends"""
        if self.query_start_time:
            execution_time = time.time() - self.query_start_time
            logger.info(f"SQL query completed in {execution_time:.2f}s")
            self.query_metadata["execution_time"] = execution_time
    
    def on_tool_error(self, error: Exception, **kwargs):
        """Called when SQL query tool errors"""
        logger.error(f"SQL query error: {error}")
        self.query_metadata["error"] = str(error)


class FibreFlowGeminiAgent:
    """
    Main agent class using Google Gemini for natural language queries
    """
    
    def __init__(self):
        self.db: Optional[NeonConnection] = None
        self.security_manager: Optional[SecurityManager] = None
        self.llm: Optional[ChatGoogleGenerativeAI] = None
        self.agent = None
        self.memory = ConversationBufferMemory()
        self.callback_handler = GeminiQueryCallbackHandler()
        
        # Initialize components
        self._initialize_components()
    
    def _initialize_components(self):
        """Initialize all components (database, security, Gemini LLM, agent)"""
        try:
            logger.info("Initializing FibreFlow Gemini Query Agent...")
            
            # Initialize database connection
            self.db = get_db()
            logger.info("Database connection initialized")
            
            # Initialize security manager
            self.security_manager = get_security_manager()
            logger.info("Security manager initialized")
            
            # Initialize Gemini
            self._initialize_gemini()
            
            # Create SQL agent with enhanced prompting
            self._create_agent()
            
            logger.info("FibreFlow Gemini Query Agent initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            raise
    
    def _initialize_gemini(self):
        """Initialize Google Gemini LLM"""
        try:
            # Get API key from environment or settings
            api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY') or os.getenv('GEMINI_API_KEY')
            
            if not api_key:
                raise ValueError("GOOGLE_AI_STUDIO_API_KEY or GEMINI_API_KEY not found in environment")
            
            # Configure the Gemini API
            genai.configure(api_key=api_key)
            
            # Create LangChain-compatible Gemini model
            model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-pro')
            
            self.llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=0.0,  # Keep at 0 for consistent SQL generation
                max_output_tokens=1000,
                convert_system_message_to_human=True
            )
            
            logger.info(f"Gemini LLM initialized: {model_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            raise
    
    def _create_agent(self):
        """Create the LangChain SQL agent with Gemini"""
        try:
            # Get database instance for LangChain
            langchain_db = self.db.get_database()
            
            # Create agent with custom prompt and configuration
            self.agent = create_sql_agent(
                llm=self.llm,
                db=langchain_db,
                agent_type="zero-shot-react-description",  # Better for Gemini
                verbose=settings.debug,
                memory=self.memory,
                max_iterations=3,
                max_execution_time=settings.query_timeout,
                callbacks=[self.callback_handler],
                # Custom agent configuration
                agent_executor_kwargs={
                    "return_intermediate_steps": True,
                    "handle_parsing_errors": True,
                }
            )
            
            logger.info("SQL agent with Gemini created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create SQL agent: {e}")
            raise
    
    def query(self, question: str, user_id: Optional[str] = None) -> Dict:
        """
        Process a natural language question and return results
        
        Args:
            question: Natural language question
            user_id: Optional user identifier for logging
            
        Returns:
            Dict with success status, answer, and metadata
        """
        
        start_time = time.time()
        
        try:
            logger.info(f"Processing query with Gemini: '{question}' (user: {user_id or 'anonymous'})")
            
            # Validate question
            if not question or not question.strip():
                return self._create_error_response("Question cannot be empty", start_time)
            
            if len(question) > 1000:
                return self._create_error_response("Question too long (max 1000 characters)", start_time)
            
            # Enhanced question with FibreFlow context
            enhanced_question = self._enhance_question_context(question)
            
            # Execute query through agent
            result = self.agent.run(enhanced_question)
            
            # Get execution metadata
            execution_time = time.time() - start_time
            metadata = self.callback_handler.query_metadata.copy()
            metadata.update({
                "total_execution_time": execution_time,
                "question": question,
                "enhanced_question": enhanced_question,
                "user_id": user_id,
                "timestamp": time.time(),
                "llm_model": "gemini"
            })
            
            # Log successful query
            self.security_manager.auditor.log_query_attempt(
                query="Generated by Gemini Agent",
                user_id=user_id,
                question=question,
                success=True,
                execution_time=execution_time
            )
            
            logger.info(f"Query completed successfully in {execution_time:.2f}s")
            
            return {
                "success": True,
                "answer": result,
                "metadata": metadata,
                "execution_time": execution_time,
                "question": question
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_message = str(e)
            
            # Log failed query
            self.security_manager.auditor.log_query_attempt(
                query="Generated by Gemini Agent",
                user_id=user_id,
                question=question,
                success=False,
                error=error_message,
                execution_time=execution_time
            )
            
            logger.error(f"Query failed after {execution_time:.2f}s: {error_message}")
            
            return self._create_error_response(error_message, start_time)
    
    def _enhance_question_context(self, question: str) -> str:
        """
        Enhance the question with FibreFlow-specific context
        This helps Gemini understand our domain better
        """
        
        context = f"""
You are a data analyst for FibreFlow, a fiber optic project management system. 
Answer questions about the following business data:

BUSINESS CONTEXT:
- Projects: Fiber optic installation projects with contractors, timelines, and budgets
- Tasks: Work items within projects (installation, testing, documentation)
- Contractors: Companies performing fiber installations 
- BOQ Items: Bill of Quantities - materials and costs for projects
- Staff: Internal team members managing projects
- Stock Items: Fiber optic cables, equipment, and materials inventory
- Daily Progress: Daily KPI tracking and progress reports
- Meetings: Team meetings with action items and decisions
- Status Changes: OneMap data tracking pole installations (15,651 records)

IMPORTANT DATABASE NOTE:
- The main data table is 'status_changes' with pole and property information
- Key fields: pole_number, property_id, status, agent_name, created_at

IMPORTANT RULES:
- Focus on business insights, not just raw data
- Include relevant context in your answers
- If multiple interpretations exist, ask for clarification
- Always limit results to reasonable numbers (top 10, etc.)
- For location-specific queries (like Lawley), check the address, zone, or pole_number fields

QUESTION: {question}

Please provide a clear, business-focused answer with relevant insights.
"""
        
        return context
    
    def _create_error_response(self, error_message: str, start_time: float) -> Dict:
        """Create standardized error response"""
        
        execution_time = time.time() - start_time
        
        return {
            "success": False,
            "error": error_message,
            "answer": None,
            "execution_time": execution_time,
            "metadata": {
                "error_type": "query_execution_error",
                "timestamp": time.time(),
                "llm_model": "gemini"
            }
        }
    
    def get_conversation_history(self) -> List[Dict]:
        """Get recent conversation history"""
        try:
            # Extract messages from memory
            history = []
            if hasattr(self.memory, 'chat_memory') and hasattr(self.memory.chat_memory, 'messages'):
                for message in self.memory.chat_memory.messages[-10:]:  # Last 10 messages
                    history.append({
                        "type": message.__class__.__name__,
                        "content": message.content,
                        "timestamp": getattr(message, 'timestamp', None)
                    })
            
            return history
            
        except Exception as e:
            logger.warning(f"Could not retrieve conversation history: {e}")
            return []
    
    def get_database_info(self) -> Dict:
        """Get information about the connected database"""
        try:
            if not self.db:
                return {"error": "Database not initialized"}
            
            stats = self.db.get_database_stats()
            schema_info = self.db.get_table_info()
            
            return {
                "connection_status": "connected",
                "whitelisted_tables": settings.whitelisted_tables,
                "table_statistics": stats,
                "schema_sample": schema_info[:500] + "..." if len(schema_info) > 500 else schema_info,
                "llm_model": "gemini"
            }
            
        except Exception as e:
            return {"error": f"Could not get database info: {e}"}
    
    def test_basic_functionality(self) -> Dict:
        """Test basic agent functionality with simple queries"""
        
        test_queries = [
            "How many records are in the status_changes table?",
            "What are the different status values?",
            "How many unique poles are there?"
        ]
        
        results = []
        
        for query in test_queries:
            logger.info(f"Testing query with Gemini: {query}")
            result = self.query(query, user_id="test")
            
            results.append({
                "query": query,
                "success": result["success"],
                "execution_time": result["execution_time"],
                "error": result.get("error") if not result["success"] else None
            })
        
        success_count = sum(1 for r in results if r["success"])
        
        return {
            "total_tests": len(test_queries),
            "successful_tests": success_count,
            "success_rate": success_count / len(test_queries) * 100,
            "results": results,
            "llm_model": "gemini"
        }
    
    def clear_memory(self):
        """Clear conversation memory"""
        self.memory.clear()
        logger.info("Conversation memory cleared")
    
    def get_agent_stats(self) -> Dict:
        """Get agent performance statistics"""
        
        recent_queries = self.security_manager.auditor.get_recent_queries(10)
        failed_queries = self.security_manager.auditor.get_failed_queries(5)
        
        total_queries = len(self.security_manager.auditor.audit_logs)
        successful_queries = len([log for log in self.security_manager.auditor.audit_logs if log["success"]])
        
        return {
            "total_queries": total_queries,
            "successful_queries": successful_queries,
            "success_rate": (successful_queries / total_queries * 100) if total_queries > 0 else 0,
            "recent_queries": recent_queries,
            "recent_failures": failed_queries,
            "average_execution_time": self._calculate_average_execution_time(),
            "llm_model": "gemini"
        }
    
    def _calculate_average_execution_time(self) -> float:
        """Calculate average execution time for successful queries"""
        
        successful_logs = [
            log for log in self.security_manager.auditor.audit_logs 
            if log["success"] and log["execution_time"]
        ]
        
        if not successful_logs:
            return 0.0
        
        total_time = sum(log["execution_time"] for log in successful_logs)
        return total_time / len(successful_logs)


# Global agent instance (created on demand)
_global_gemini_agent: Optional[FibreFlowGeminiAgent] = None


def get_gemini_agent() -> FibreFlowGeminiAgent:
    """Get or create the global Gemini agent instance"""
    global _global_gemini_agent
    
    if _global_gemini_agent is None:
        logger.info("Creating global FibreFlow Gemini Query Agent instance")
        _global_gemini_agent = FibreFlowGeminiAgent()
    
    return _global_gemini_agent


def process_question_with_gemini(question: str, user_id: Optional[str] = None) -> Dict:
    """
    Convenience function to process a question with Gemini
    
    Args:
        question: Natural language question
        user_id: Optional user identifier
        
    Returns:
        Dict with query results
    """
    agent = get_gemini_agent()
    return agent.query(question, user_id)


def test_gemini_agent() -> Dict:
    """Test the Gemini agent with basic functionality"""
    agent = get_gemini_agent()
    return agent.test_basic_functionality()