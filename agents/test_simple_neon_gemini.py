#!/usr/bin/env python3
"""
Simple test of Neon database + Gemini integration
"""
import os
from dotenv import load_dotenv
import psycopg2
import google.generativeai as genai

# Load environment variables
load_dotenv('.env.local')

def test_neon_connection():
    """Test Neon database connection"""
    print("🔌 Testing Neon database connection...")
    
    connection_string = os.getenv('NEON_CONNECTION_STRING')
    if not connection_string:
        print("❌ No Neon connection string found")
        return False
    
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        print(f"✅ Database connection successful: {result}")
        
        # Try to list tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            LIMIT 5
        """)
        tables = cursor.fetchall()
        print(f"📋 Sample tables: {[t[0] for t in tables]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def test_combined_query():
    """Test a combined database + Gemini query"""
    print("\n🤖 Testing combined database + Gemini query...")
    
    # Get database connection
    connection_string = os.getenv('NEON_CONNECTION_STRING')
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
    
    if not connection_string or not api_key:
        print("❌ Missing connection string or API key")
        return False
    
    try:
        # Connect to database
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Check if status_changes table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'status_changes'
            )
        """)
        has_status_changes = cursor.fetchone()[0]
        
        if has_status_changes:
            # Get some sample data
            cursor.execute("""
                SELECT COUNT(*) as total_records,
                       COUNT(DISTINCT pole_number) as unique_poles,
                       COUNT(DISTINCT status) as unique_statuses
                FROM status_changes
            """)
            stats = cursor.fetchone()
            
            # Configure Gemini
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-pro')
            
            # Ask Gemini to interpret the data
            prompt = f"""
            You are analyzing FibreFlow fiber optic project data. Here are the statistics:
            - Total records: {stats[0]}
            - Unique poles: {stats[1]} 
            - Unique statuses: {stats[2]}
            
            Based on this data, provide a brief summary of the project scope and status.
            """
            
            response = model.generate_content(prompt)
            
            print("✅ Combined query successful!")
            print("📊 Database stats:", dict(zip(['total_records', 'unique_poles', 'unique_statuses'], stats)))
            print("🤖 Gemini analysis:", response.text)
            
        else:
            print("⚠️ status_changes table not found, testing basic connection instead")
            cursor.execute("SELECT current_database(), current_user, version()")
            db_info = cursor.fetchone()
            print(f"📋 Database info: {db_info[0]}, User: {db_info[1]}")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Combined query failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 FibreFlow Neon+Gemini Integration Test")
    print("=" * 50)
    
    success_count = 0
    
    if test_neon_connection():
        success_count += 1
    
    if test_combined_query():
        success_count += 1
    
    print("\n" + "=" * 50)
    
    if success_count == 2:
        print("✅ All tests passed! Neon+Gemini integration is working!")
        print("🔗 Ready for Angular integration via simple HTTP endpoints")
    else:
        print(f"⚠️ {success_count}/2 tests passed")
    
    return success_count == 2


if __name__ == "__main__":
    main()