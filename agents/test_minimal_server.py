#!/usr/bin/env python3
"""
Minimal test server to check basic functionality
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
import psycopg2

# Load environment variables
load_dotenv('.env.local')

app = FastAPI(title="Test Server")

@app.get("/")
async def root():
    return {"message": "Server is running!"}

@app.get("/test-db")
async def test_database():
    """Test database connection"""
    try:
        connection_string = os.getenv('NEON_CONNECTION_STRING')
        if not connection_string:
            return {"error": "No connection string"}
        
        conn = psycopg2.connect(connection_string, connect_timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM status_changes LIMIT 1")
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        return {"status": "success", "count": count}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    print("🧪 Starting minimal test server...")
    uvicorn.run(app, host="127.0.0.1", port=8001)