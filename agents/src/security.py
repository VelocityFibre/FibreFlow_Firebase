"""
Security validation and query sanitization for FibreFlow Neon Query Agent
"""
import re
import logging
import hashlib
from typing import Tuple, List, Optional, Dict
from datetime import datetime
from config import FORBIDDEN_SQL_PATTERNS, settings

logger = logging.getLogger(__name__)


class QueryValidator:
    """Validates and sanitizes SQL queries for security"""
    
    def __init__(self):
        self.forbidden_patterns = FORBIDDEN_SQL_PATTERNS
        self.max_query_length = 10000  # Max characters in query
        self.max_result_rows = settings.max_query_results
    
    def validate_query(self, query: str) -> Tuple[bool, str]:
        """
        Comprehensive query validation
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        
        # Basic checks
        if not query or not query.strip():
            return False, "Query cannot be empty"
        
        if len(query) > self.max_query_length:
            return False, f"Query too long (max {self.max_query_length} characters)"
        
        query_upper = query.upper().strip()
        
        # Must start with SELECT
        if not query_upper.startswith('SELECT'):
            return False, "Only SELECT queries are allowed"
        
        # Check for forbidden operations
        for pattern in self.forbidden_patterns:
            if re.search(pattern, query_upper, re.IGNORECASE):
                return False, f"Forbidden operation detected: {pattern.replace('\\s+', ' ')}"
        
        # Check for suspicious patterns
        suspicious_checks = [
            (r';\s*SELECT', "Multiple statements not allowed"),
            (r'UNION\s+ALL\s+SELECT', "UNION operations restricted"),
            (r'EXEC\s*\(', "Dynamic execution not allowed"),
            (r'@@', "System variables access denied"),
            (r'INFORMATION_SCHEMA', "System schema access denied"),
            (r'PG_', "PostgreSQL system functions restricted"),
        ]
        
        for pattern, message in suspicious_checks:
            if re.search(pattern, query_upper):
                return False, message
        
        # Validate table access
        table_validation = self._validate_table_access(query_upper)
        if not table_validation[0]:
            return table_validation
        
        # Check for reasonable LIMIT
        if not self._has_reasonable_limit(query_upper):
            logger.warning(f"Query without LIMIT will be restricted to {self.max_result_rows} rows")
        
        return True, "Query validated successfully"
    
    def sanitize_query(self, query: str) -> str:
        """
        Sanitize query by adding safety measures
        
        Args:
            query: Raw SQL query
            
        Returns:
            Sanitized query with LIMIT and safety measures
        """
        
        # Remove comments
        query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
        query = re.sub(r'/\*.*?\*/', '', query, flags=re.DOTALL)
        
        # Ensure query ends properly
        query = query.strip().rstrip(';')
        
        # Add LIMIT if not present
        if not self._has_limit_clause(query):
            query = f"{query} LIMIT {self.max_result_rows}"
        
        # Add semicolon
        query = f"{query};"
        
        return query
    
    def _validate_table_access(self, query: str) -> Tuple[bool, str]:
        """Validate that query only accesses whitelisted tables"""
        
        whitelisted = set(settings.whitelisted_tables)
        
        # Extract table names from FROM and JOIN clauses
        table_patterns = [
            r'FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        ]
        
        found_tables = set()
        for pattern in table_patterns:
            matches = re.findall(pattern, query, re.IGNORECASE)
            found_tables.update([table.lower() for table in matches])
        
        # Check if all found tables are whitelisted
        unauthorized_tables = found_tables - {table.lower() for table in whitelisted}
        
        if unauthorized_tables:
            return False, f"Access denied to tables: {', '.join(unauthorized_tables)}"
        
        return True, "Table access validated"
    
    def _has_limit_clause(self, query: str) -> bool:
        """Check if query has LIMIT clause"""
        return bool(re.search(r'\bLIMIT\s+\d+', query, re.IGNORECASE))
    
    def _has_reasonable_limit(self, query: str) -> bool:
        """Check if query has reasonable LIMIT value"""
        limit_match = re.search(r'\bLIMIT\s+(\d+)', query, re.IGNORECASE)
        if not limit_match:
            return False
        
        limit_value = int(limit_match.group(1))
        return limit_value <= self.max_result_rows


class QueryAuditor:
    """Audits and logs all query operations"""
    
    def __init__(self):
        self.audit_logs: List[Dict] = []
    
    def log_query_attempt(self, 
                         query: str, 
                         user_id: Optional[str] = None,
                         question: Optional[str] = None,
                         success: bool = True,
                         error: Optional[str] = None,
                         execution_time: Optional[float] = None) -> str:
        """
        Log a query attempt
        
        Returns:
            Query ID for tracking
        """
        
        query_id = self._generate_query_id(query)
        
        log_entry = {
            "query_id": query_id,
            "timestamp": datetime.utcnow().isoformat(),
            "query": query,
            "question": question,
            "user_id": user_id,
            "success": success,
            "error": error,
            "execution_time": execution_time,
            "query_hash": hashlib.md5(query.encode()).hexdigest()
        }
        
        self.audit_logs.append(log_entry)
        
        # Log to application logger
        if success:
            logger.info(f"Query {query_id} executed successfully in {execution_time:.2f}s")
        else:
            logger.warning(f"Query {query_id} failed: {error}")
        
        return query_id
    
    def get_recent_queries(self, limit: int = 10) -> List[Dict]:
        """Get recent query attempts"""
        return sorted(self.audit_logs, key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    def get_failed_queries(self, limit: int = 10) -> List[Dict]:
        """Get recent failed queries"""
        failed = [log for log in self.audit_logs if not log['success']]
        return sorted(failed, key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    def _generate_query_id(self, query: str) -> str:
        """Generate unique ID for query"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        query_hash = hashlib.md5(query.encode()).hexdigest()[:8]
        return f"query_{timestamp}_{query_hash}"


class SecurityManager:
    """Main security manager for the query agent"""
    
    def __init__(self):
        self.validator = QueryValidator()
        self.auditor = QueryAuditor()
        self.rate_limiter = QueryRateLimiter()
    
    def validate_and_sanitize(self, 
                            query: str,
                            user_id: Optional[str] = None) -> Tuple[bool, str, str]:
        """
        Complete security validation and sanitization
        
        Returns:
            Tuple[bool, str, str]: (is_valid, sanitized_query_or_error, message)
        """
        
        # Rate limiting check
        if not self.rate_limiter.is_allowed(user_id or "anonymous"):
            return False, "", "Rate limit exceeded. Please wait before making another query."
        
        # Validate query
        is_valid, validation_message = self.validator.validate_query(query)
        
        if not is_valid:
            # Log failed validation
            self.auditor.log_query_attempt(
                query=query,
                user_id=user_id,
                success=False,
                error=f"Validation failed: {validation_message}"
            )
            return False, "", validation_message
        
        # Sanitize query
        try:
            sanitized_query = self.validator.sanitize_query(query)
            return True, sanitized_query, "Query validated and sanitized successfully"
            
        except Exception as e:
            error_msg = f"Query sanitization failed: {str(e)}"
            self.auditor.log_query_attempt(
                query=query,
                user_id=user_id,
                success=False,
                error=error_msg
            )
            return False, "", error_msg


class QueryRateLimiter:
    """Rate limiting for query requests"""
    
    def __init__(self):
        self.requests: Dict[str, List[datetime]] = {}
        self.max_requests_per_minute = 10
        self.max_requests_per_hour = 100
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is within rate limits"""
        
        now = datetime.utcnow()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if (now - req_time).seconds < 3600  # Keep last hour
        ]
        
        recent_requests = self.requests[identifier]
        
        # Check per-minute limit
        requests_last_minute = [
            req_time for req_time in recent_requests
            if (now - req_time).seconds < 60
        ]
        
        if len(requests_last_minute) >= self.max_requests_per_minute:
            logger.warning(f"Rate limit exceeded for {identifier}: {len(requests_last_minute)} requests in last minute")
            return False
        
        # Check per-hour limit
        if len(recent_requests) >= self.max_requests_per_hour:
            logger.warning(f"Rate limit exceeded for {identifier}: {len(recent_requests)} requests in last hour")
            return False
        
        # Record this request
        self.requests[identifier].append(now)
        
        return True


# Global security manager instance
security_manager = SecurityManager()


def get_security_manager() -> SecurityManager:
    """Get the global security manager instance"""
    return security_manager


def validate_query_security(query: str, user_id: Optional[str] = None) -> Tuple[bool, str, str]:
    """
    Convenience function for query security validation
    
    Returns:
        Tuple[bool, str, str]: (is_valid, sanitized_query_or_error, message)
    """
    return security_manager.validate_and_sanitize(query, user_id)