"""
Configuration management for FibreFlow Neon Query Agent
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    secret_key: str = "dev-secret-key-change-in-production"
    
    # Database Settings
    neon_connection_string: str
    neon_project_id: Optional[str] = None
    neon_api_key: Optional[str] = None
    
    # LLM Settings
    openai_api_key: str
    default_model: str = "gpt-4-turbo"
    temperature: float = 0.0
    max_tokens: int = 1000
    
    # Redis Settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    enable_caching: bool = True
    cache_ttl: int = 3600  # 1 hour
    
    # Security Settings
    whitelisted_tables: List[str] = [
        "status_changes",  # Main OneMap data table (15,651 rows)
        "projects", 
        "tasks", 
        "contractors", 
        "boq_items",
        "staff", 
        "daily_progress", 
        "stock_items",
        "meetings",
        "clients"
    ]
    max_query_results: int = 100
    query_timeout: int = 30
    enable_sandbox_branching: bool = True
    
    # FibreFlow Integration
    fibreflow_base_url: str = "https://fibreflow-73daf.web.app"
    firebase_project_id: str = "fibreflow-73daf"
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/agent.log"
    
    # Environment
    environment: str = "development"
    
    @field_validator('neon_connection_string')
    @classmethod
    def validate_connection_string(cls, v):
        if not v or not v.startswith('postgresql://'):
            raise ValueError('Invalid Neon connection string')
        return v
    
    @field_validator('openai_api_key')
    @classmethod
    def validate_openai_key(cls, v):
        if not v or not v.startswith('sk-'):
            raise ValueError('Invalid OpenAI API key')
        return v
    
    model_config = {
        "env_file": ".env.local",
        "case_sensitive": False,
        "extra": "ignore"
    }


# Global settings instance
settings = Settings()


def get_database_config() -> dict:
    """Get database configuration for LangChain SQLDatabase"""
    return {
        "uri": settings.neon_connection_string,
        "include_tables": settings.whitelisted_tables,
        "sample_rows_in_table_info": 3
    }


def get_llm_config() -> dict:
    """Get LLM configuration"""
    return {
        "model": settings.default_model,
        "temperature": settings.temperature,
        "max_tokens": settings.max_tokens,
        "api_key": settings.openai_api_key
    }


def get_redis_config() -> dict:
    """Get Redis configuration"""
    config = {
        "host": settings.redis_host,
        "port": settings.redis_port,
        "decode_responses": True
    }
    
    if settings.redis_password:
        config["password"] = settings.redis_password
    
    return config


def is_production() -> bool:
    """Check if running in production environment"""
    return settings.environment.lower() == "production"


def is_development() -> bool:
    """Check if running in development environment"""
    return settings.environment.lower() == "development"


# Security configurations
FORBIDDEN_SQL_PATTERNS = [
    r'DROP\s+TABLE',
    r'DELETE\s+FROM',
    r'TRUNCATE\s+TABLE',
    r'UPDATE\s+.*SET',
    r'INSERT\s+INTO',
    r'ALTER\s+TABLE',
    r'CREATE\s+TABLE',
    r'GRANT\s+',
    r'REVOKE\s+',
    r'--\s*',
    r'/\*.*\*/',
    r'xp_cmdshell',
    r'sp_executesql'
]

# Query result limits
MAX_RESULT_ROWS = settings.max_query_results
QUERY_TIMEOUT_SECONDS = settings.query_timeout

# CORS settings for FibreFlow integration
ALLOWED_ORIGINS = [
    "http://localhost:4200",  # Angular dev server
    "https://fibreflow-73daf.web.app",  # Production
    "https://fibreflow.web.app",  # Custom domain
    settings.fibreflow_base_url
]