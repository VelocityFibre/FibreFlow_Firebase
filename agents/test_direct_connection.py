#!/usr/bin/env python3
"""
Test direct Neon connection with explicit parameters
"""
import os
import psycopg2
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv('.env.local')

def test_with_explicit_port():
    """Test connection with explicit port specification"""
    print("🔌 Testing Direct Neon Connection (Port 5432)...")
    print("=" * 50)
    
    # Parse connection string manually
    connection_string = os.getenv('NEON_CONNECTION_STRING')
    
    # Extract components
    import re
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+)', connection_string)
    if not match:
        print("❌ Failed to parse connection string")
        return False
    
    user, password, host, database = match.groups()
    
    # Remove -pooler if present
    host = host.replace('-pooler', '')
    
    print(f"📋 Connection details:")
    print(f"   Host: {host}")
    print(f"   Port: 5432 (direct)")
    print(f"   Database: {database}")
    print(f"   User: {user}")
    
    # Try different connection methods
    connection_params = [
        {
            "name": "Method 1: Connection string with explicit port",
            "method": lambda: psycopg2.connect(
                f"postgresql://{user}:{password}@{host}:5432/{database}?sslmode=require",
                connect_timeout=10
            )
        },
        {
            "name": "Method 2: Individual parameters",
            "method": lambda: psycopg2.connect(
                host=host,
                port=5432,
                database=database,
                user=user,
                password=password,
                sslmode='require',
                connect_timeout=10
            )
        },
        {
            "name": "Method 3: DSN format",
            "method": lambda: psycopg2.connect(
                f"host={host} port=5432 dbname={database} user={user} password={password} sslmode=require connect_timeout=10"
            )
        }
    ]
    
    for params in connection_params:
        print(f"\n🔄 Trying {params['name']}...")
        start_time = time.time()
        
        try:
            conn = params['method']()
            connect_time = time.time() - start_time
            
            print(f"✅ Connected successfully! (took {connect_time:.2f} seconds)")
            
            # Test query
            cursor = conn.cursor()
            cursor.execute("SELECT current_database(), version()")
            result = cursor.fetchone()
            print(f"   Database: {result[0]}")
            print(f"   Version: {result[1][:50]}...")
            
            # Check for status_changes table
            cursor.execute("""
                SELECT table_name, pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%status%' OR table_name LIKE '%pole%'
                ORDER BY table_name
            """)
            tables = cursor.fetchall()
            
            if tables:
                print(f"\n📋 Found {len(tables)} relevant tables:")
                for table, size in tables:
                    print(f"   - {table}: {size}")
            
            cursor.close()
            conn.close()
            
            print("\n✅ Connection test successful!")
            return True
            
        except Exception as e:
            connect_time = time.time() - start_time
            print(f"❌ Failed after {connect_time:.2f} seconds")
            print(f"   Error: {str(e)[:100]}...")
            
            # Check specific error
            if "port 5433" in str(e):
                print("   ⚠️  Still trying port 5433 (pooler)")
            elif "timeout" in str(e):
                print("   ⚠️  Connection timeout")
            elif "authentication" in str(e):
                print("   ⚠️  Authentication failed")
    
    return False


if __name__ == "__main__":
    print("🚀 Neon Direct Connection Test")
    print("=" * 50)
    
    if not os.getenv('NEON_CONNECTION_STRING'):
        print("❌ No NEON_CONNECTION_STRING found")
        exit(1)
    
    success = test_with_explicit_port()
    
    if not success:
        print("\n💡 Next steps:")
        print("1. Check if the database is active in Neon console")
        print("2. Try using psql command line:")
        print("   psql 'host=ep-long-breeze-a9w7xool.gwc.azure.neon.tech port=5432 dbname=neondb user=neondb_owner sslmode=require'")
        print("3. Check firewall/VPN settings")
        print("4. Contact Neon support if issue persists")