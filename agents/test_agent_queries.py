#!/usr/bin/env python3
"""
Test the Neon+Gemini agent with real queries
"""
import requests
import json

# Base URL for the agent API
BASE_URL = "http://localhost:8000"

def test_agent_query(question: str, include_sql: bool = True):
    """Test a specific query"""
    print(f"\n🔍 Testing query: {question}")
    print("=" * 50)
    
    payload = {
        "question": question,
        "user_id": "test_user",
        "include_sql": include_sql,
        "include_metadata": True
    }
    
    try:
        response = requests.post(f"{BASE_URL}/query", json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"✅ Success: {result['success']}")
            print(f"⏱️  Execution time: {result['execution_time']}ms")
            
            if result['success']:
                print(f"📝 Answer:\n{result['answer']}")
                
                if result.get('sql_query'):
                    print(f"\n🗄️  SQL Query:\n{result['sql_query']}")
                
                if result.get('metadata'):
                    print(f"\n📊 Metadata:")
                    print(f"   - Results count: {result['metadata'].get('results_count', 'N/A')}")
                    print(f"   - Query type: {result['metadata'].get('query_type', 'N/A')}")
                    print(f"   - LLM model: {result['metadata'].get('llm_model', 'N/A')}")
            else:
                print(f"❌ Error: {result.get('error', 'Unknown error')}")
                
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

def test_health_check():
    """Test the health endpoint"""
    print("🏥 Testing health check...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Status: {health['status']}")
            print(f"🗄️  Database connected: {health['database_connected']}")
            print(f"🤖 Agent ready: {health['agent_ready']}")
            print(f"⏱️  Uptime: {health['uptime']} seconds")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")

def test_database_info():
    """Test the database info endpoint"""
    print("🗄️  Testing database info...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/database/info", timeout=10)
        if response.status_code == 200:
            db_info = response.json()
            print(f"✅ Connection status: {db_info['connection_status']}")
            
            if 'database_version' in db_info:
                print(f"🗄️  PostgreSQL version: {db_info['database_version']}")
                print(f"📊 Total tables: {db_info['total_tables']}")
                
                if 'table_statistics' in db_info:
                    print("📈 Table statistics:")
                    for table, count in db_info['table_statistics'].items():
                        print(f"   - {table}: {count:,} records")
                
                if 'supported_queries' in db_info:
                    print("💡 Supported query types:")
                    for query_type in db_info['supported_queries']:
                        print(f"   - {query_type}")
        else:
            print(f"❌ Database info failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Database info error: {str(e)}")

if __name__ == "__main__":
    print("🧪 Testing FibreFlow Neon+Gemini Agent")
    print("=" * 60)
    
    # Test 1: Health check
    test_health_check()
    
    # Test 2: Database info
    test_database_info()
    
    # Test 3: Simple counting query
    test_agent_query("How many total records are in the status_changes table?")
    
    # Test 4: Specific pole query
    test_agent_query("What is the status of pole LAW.P.B167?")
    
    # Test 5: Agent analysis query
    test_agent_query("Which agent has handled the most poles in Lawley?")
    
    # Test 6: Status summary
    test_agent_query("Give me a summary of different pole statuses in the database")
    
    # Test 7: Unsupported query
    test_agent_query("What's the weather like today?", include_sql=False)
    
    print("\n" + "=" * 60)
    print("🎉 Agent testing complete!")