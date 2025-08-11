#!/usr/bin/env python3
"""
Test the FibreFlow Query Agent with real Neon database and Gemini
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import logging
from database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_database_connection():
    """Test connection to real Neon database"""
    print("🗄️  Testing Neon Database Connection...")
    
    try:
        db = get_db()
        
        # Test connection
        if db.test_connection():
            print("   ✅ Connected to Neon database successfully!")
        else:
            print("   ❌ Failed to connect to Neon database")
            return False
        
        # Get table info
        schema_info = db.get_table_info(['status_changes'])
        
        if schema_info:
            print("   ✅ Retrieved status_changes table schema")
            print(f"   ✅ Schema preview: {schema_info[:200]}...")
        else:
            print("   ❌ Could not retrieve table schema")
            return False
        
        # Test a simple query
        try:
            result = db.execute_query("SELECT COUNT(*) FROM status_changes")
            print(f"   ✅ Test query successful. Result: {result}")
            
            # Get more detailed stats
            stats_query = """
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT pole_number) as unique_poles,
                COUNT(DISTINCT property_id) as unique_properties,
                COUNT(DISTINCT status) as unique_statuses
            FROM status_changes
            """
            
            stats_result = db.execute_query(stats_query)
            print(f"   ✅ Database statistics: {stats_result}")
            
        except Exception as e:
            print(f"   ❌ Query failed: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"   ❌ Database connection test failed: {e}")
        return False


def test_lawley_poles():
    """Test specific Lawley pole queries"""
    print("\n🏘️  Testing Lawley Pole Queries...")
    
    try:
        db = get_db()
        
        # Query 1: Count Lawley poles
        lawley_query = """
        SELECT 
            COUNT(DISTINCT pole_number) as total_poles,
            COUNT(*) as total_records
        FROM status_changes
        WHERE 
            pole_number LIKE 'LAW.%' 
            OR LOWER(address) LIKE '%lawley%'
            OR LOWER(zone) LIKE '%lawley%'
        """
        
        result = db.execute_query(lawley_query)
        print(f"   ✅ Lawley statistics: {result}")
        
        # Query 2: Status distribution for Lawley
        status_query = """
        SELECT 
            status,
            COUNT(*) as count
        FROM status_changes
        WHERE 
            pole_number LIKE 'LAW.%' 
            OR LOWER(address) LIKE '%lawley%'
            OR LOWER(zone) LIKE '%lawley%'
        GROUP BY status
        ORDER BY count DESC
        LIMIT 10
        """
        
        status_result = db.execute_query(status_query)
        print(f"   ✅ Lawley status distribution: {status_result}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Lawley query test failed: {e}")
        return False


def test_gemini_agent():
    """Test Gemini agent (if API key is set)"""
    print("\n🤖 Testing Gemini Agent...")
    
    # Check if Gemini API key is set
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY') or os.getenv('GEMINI_API_KEY')
    
    if not api_key or api_key == 'YOUR-GEMINI-API-KEY-HERE':
        print("   ⚠️  Gemini API key not set. Skipping agent test.")
        print("   📝 To test Gemini agent:")
        print("      1. Get API key from https://aistudio.google.com/app/apikey")
        print("      2. Add to .env.local: GOOGLE_AI_STUDIO_API_KEY=your-key")
        return True
    
    try:
        from agent_gemini import get_gemini_agent, test_gemini_agent
        
        print("   🔄 Initializing Gemini agent...")
        agent = get_gemini_agent()
        
        print("   🔄 Running basic functionality tests...")
        test_results = test_gemini_agent()
        
        if test_results['success_rate'] == 100:
            print(f"   ✅ All {test_results['total_tests']} tests passed!")
        else:
            print(f"   ⚠️  {test_results['successful_tests']}/{test_results['total_tests']} tests passed")
        
        # Test specific Lawley query
        print("\n   🔄 Testing Lawley pole query with Gemini...")
        result = agent.query("How many poles have been planted in Lawley?")
        
        if result['success']:
            print(f"   ✅ Query successful!")
            print(f"   📊 Answer: {result['answer']}")
            print(f"   ⏱️  Execution time: {result['execution_time']:.2f}s")
        else:
            print(f"   ❌ Query failed: {result['error']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Gemini agent test failed: {e}")
        return False


def show_next_steps():
    """Show next steps for full integration"""
    print("\n📋 Next Steps:")
    print("   1. Add Gemini API key to .env.local")
    print("   2. Start the API server: python src/api.py")
    print("   3. Test via API: curl http://localhost:8000/health")
    print("   4. Query example:")
    print('      curl -X POST http://localhost:8000/query \\')
    print('        -H "Content-Type: application/json" \\')
    print('        -d \'{"question": "How many poles in Lawley?"}\'')


def main():
    """Run all tests"""
    print("🚀 FibreFlow Neon + Gemini Integration Test")
    print("=" * 60)
    
    all_passed = True
    
    # Test database connection
    all_passed &= test_database_connection()
    
    # Test Lawley-specific queries
    all_passed &= test_lawley_poles()
    
    # Test Gemini agent
    all_passed &= test_gemini_agent()
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✅ All tests passed! System is ready.")
        show_next_steps()
    else:
        print("❌ Some tests failed. Please check the configuration.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())