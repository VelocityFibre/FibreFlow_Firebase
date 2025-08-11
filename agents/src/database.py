"""
Database connection and management for FibreFlow Neon Query Agent
"""
import logging
from typing import Optional, List
from langchain_community.utilities import SQLDatabase
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from config import settings, get_database_config

logger = logging.getLogger(__name__)


class NeonConnection:
    """Manages connection to Neon Postgres database"""
    
    def __init__(self):
        self.connection_string = settings.neon_connection_string
        self.whitelisted_tables = settings.whitelisted_tables
        self._db: Optional[SQLDatabase] = None
        self._engine: Optional[Engine] = None
    
    def get_database(self) -> SQLDatabase:
        """Get LangChain SQLDatabase instance with table restrictions"""
        if self._db is None:
            try:
                logger.info("Connecting to Neon database...")
                config = get_database_config()
                
                self._db = SQLDatabase.from_uri(
                    config["uri"],
                    include_tables=config["include_tables"],
                    sample_rows_in_table_info=config["sample_rows_in_table_info"]
                )
                
                logger.info(f"Connected to database with {len(config['include_tables'])} whitelisted tables")
                
            except Exception as e:
                logger.error(f"Failed to connect to database: {e}")
                raise
        
        return self._db
    
    def get_engine(self) -> Engine:
        """Get SQLAlchemy engine for direct database operations"""
        if self._engine is None:
            self._engine = create_engine(
                self.connection_string,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={"sslmode": "require"}
            )
        
        return self._engine
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            db = self.get_database()
            # Try a simple query
            result = db.run("SELECT 1 as test")
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def get_table_info(self, tables: Optional[List[str]] = None) -> str:
        """Get schema information for specified tables"""
        try:
            db = self.get_database()
            if tables:
                # Filter to only requested tables that are also whitelisted
                allowed_tables = [t for t in tables if t in self.whitelisted_tables]
                return db.get_table_info(table_names=allowed_tables)
            else:
                return db.get_table_info()
        except Exception as e:
            logger.error(f"Failed to get table info: {e}")
            return ""
    
    def execute_query(self, query: str) -> str:
        """Execute a SQL query safely with limits"""
        try:
            db = self.get_database()
            
            # Add LIMIT clause if not present
            if not self._has_limit_clause(query):
                query = f"{query.rstrip(';')} LIMIT {settings.max_query_results};"
            
            result = db.run(query)
            logger.info(f"Query executed successfully: {query[:100]}...")
            return result
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def get_database_stats(self) -> dict:
        """Get basic statistics about the database"""
        try:
            db = self.get_database()
            stats = {}
            
            for table in self.whitelisted_tables:
                try:
                    count_result = db.run(f"SELECT COUNT(*) FROM {table}")
                    stats[table] = int(count_result.strip())
                except Exception as e:
                    logger.warning(f"Could not get count for table {table}: {e}")
                    stats[table] = "Unknown"
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {}
    
    def _has_limit_clause(self, query: str) -> bool:
        """Check if query already has a LIMIT clause"""
        return "LIMIT" in query.upper()
    
    def close(self):
        """Close database connections"""
        if self._engine:
            self._engine.dispose()
            self._engine = None
        self._db = None
        logger.info("Database connections closed")


# Global database instance
db_connection = NeonConnection()


def get_db() -> NeonConnection:
    """Get the global database connection instance"""
    return db_connection


def initialize_database() -> bool:
    """Initialize and test database connection"""
    try:
        logger.info("Initializing database connection...")
        db = get_db()
        
        if not db.test_connection():
            logger.error("Database connection test failed")
            return False
        
        # Log table statistics
        stats = db.get_database_stats()
        logger.info("Database initialized successfully")
        logger.info(f"Available tables: {list(stats.keys())}")
        
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False


def create_readonly_user_script() -> str:
    """Generate SQL script to create read-only user for the agent"""
    password_placeholder = "REPLACE_WITH_SECURE_PASSWORD"
    
    script = f"""
-- SQL Script to create read-only user for FibreFlow Query Agent
-- Run this in your Neon database console

-- 1. Create user
CREATE USER ai_agent WITH PASSWORD '{password_placeholder}';

-- 2. Grant connection
GRANT CONNECT ON DATABASE fibreflow TO ai_agent;
GRANT USAGE ON SCHEMA public TO ai_agent;

-- 3. Grant SELECT on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_agent;

-- 4. Grant SELECT on future tables (optional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_agent;

-- 5. Enable Row Level Security (basic setup)
-- Uncomment these lines after creating appropriate policies
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY ai_agent_policy ON projects 
--   FOR SELECT TO ai_agent 
--   USING (status != 'confidential');

-- 6. Verify user was created
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'ai_agent';

-- Remember to:
-- 1. Replace '{password_placeholder}' with a secure password
-- 2. Update your .env.local with the new connection string
-- 3. Test the connection with the new credentials
"""
    
    return script