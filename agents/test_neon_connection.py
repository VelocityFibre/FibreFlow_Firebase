#!/usr/bin/env python3
"""
Test Neon database connection directly
"""
import os
import psycopg2
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv('.env.local')

def test_neon_connection():
    """Test connection to Neon database"""
    print("🔌 Testing Neon Database Connection...")
    print("=" * 50)
    
    # Get connection string
    connection_string = os.getenv('NEON_CONNECTION_STRING')
    
    if not connection_string:
        print("❌ No NEON_CONNECTION_STRING found in .env.local")
        return False
    
    # Mask password for display
    display_string = connection_string
    if '@' in display_string:
        parts = display_string.split('@')
        if ':' in parts[0]:
            user_pass = parts[0].split('://')[-1]
            if ':' in user_pass:
                user = user_pass.split(':')[0]
                display_string = display_string.replace(user_pass, f"{user}:****")
    
    print(f"📋 Connection string: {display_string}")
    print("🔄 Attempting to connect...")
    
    start_time = time.time()
    
    try:
        # Try to connect with a timeout
        conn = psycopg2.connect(connection_string, connect_timeout=10)
        connect_time = time.time() - start_time
        
        print(f"✅ Connection successful! (took {connect_time:.2f} seconds)")
        
        # Get cursor
        cursor = conn.cursor()
        
        # Test 1: Check current database
        cursor.execute("SELECT current_database(), current_user, version()")
        db_info = cursor.fetchone()
        print(f"\n📊 Database Info:")
        print(f"   - Database: {db_info[0]}")
        print(f"   - User: {db_info[1]}")
        print(f"   - Version: {db_info[2][:50]}...")
        
        # Test 2: List tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
            LIMIT 10
        """)
        tables = cursor.fetchall()
        
        print(f"\n📋 Tables found: {len(tables)}")
        if tables:
            print("   Sample tables:")
            for table in tables[:5]:
                print(f"   - {table[0]}")
        
        # Test 3: Check for status_changes table specifically
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'status_changes'
            )
        """)
        has_status_changes = cursor.fetchone()[0]
        
        if has_status_changes:
            print("\n✅ Found 'status_changes' table!")
            
            # Get row count
            cursor.execute("SELECT COUNT(*) FROM status_changes")
            count = cursor.fetchone()[0]
            print(f"   - Total records: {count:,}")
            
            # Get sample data
            cursor.execute("""
                SELECT pole_number, status, agent_name 
                FROM status_changes 
                WHERE pole_number LIKE 'LAW%' 
                LIMIT 3
            """)
            samples = cursor.fetchall()
            
            if samples:
                print("   - Sample Lawley poles:")
                for sample in samples:
                    print(f"     • {sample[0]} - {sample[1]} (Agent: {sample[2]})")
        else:
            print("\n⚠️ 'status_changes' table not found")
            
            # Check what tables exist
            cursor.execute("""
                SELECT table_name, 
                       pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY pg_total_relation_size(table_schema||'.'||table_name) DESC
                LIMIT 5
            """)
            biggest_tables = cursor.fetchall()
            
            if biggest_tables:
                print("\n📊 Largest tables:")
                for table, size in biggest_tables:
                    print(f"   - {table}: {size}")
        
        # Close connection
        cursor.close()
        conn.close()
        
        print("\n✅ All tests passed! Neon connection is working perfectly!")
        return True
        
    except psycopg2.OperationalError as e:
        connect_time = time.time() - start_time
        print(f"\n❌ Connection failed after {connect_time:.2f} seconds")
        print(f"Error: {str(e)}")
        
        # Common issues
        if "timeout expired" in str(e):
            print("\n💡 Possible issues:")
            print("   - Network firewall blocking connection")
            print("   - VPN required for connection")
            print("   - Neon database is paused (wake it up in Neon console)")
        elif "password authentication failed" in str(e):
            print("\n💡 Issue: Invalid credentials")
            print("   - Check username and password in connection string")
        elif "could not translate host name" in str(e):
            print("\n💡 Issue: Invalid host")
            print("   - Check the database URL is correct")
            
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {type(e).__name__}: {str(e)}")
        return False


def test_simple_query():
    """Test a simple query if connection works"""
    connection_string = os.getenv('NEON_CONNECTION_STRING')
    
    if not connection_string:
        return
    
    print("\n" + "=" * 50)
    print("🔍 Testing Simple Query...")
    
    try:
        conn = psycopg2.connect(connection_string, connect_timeout=5)
        cursor = conn.cursor()
        
        # Simple test query
        cursor.execute("SELECT 1 + 1 as result")
        result = cursor.fetchone()[0]
        print(f"✅ Query test: 1 + 1 = {result}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Query failed: {str(e)}")


if __name__ == "__main__":
    print("🚀 Neon Database Connection Test")
    print("=" * 50)
    
    # Check environment file
    if os.path.exists('.env.local'):
        print("✅ Found .env.local file")
    else:
        print("❌ .env.local file not found!")
        exit(1)
    
    # Run tests
    if test_neon_connection():
        test_simple_query()
    
    print("\n" + "=" * 50)
    print("Test complete!")