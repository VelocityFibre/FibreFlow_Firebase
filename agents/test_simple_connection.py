#!/usr/bin/env python3
"""
Simple test to verify Neon connection
"""
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Connection parameters
CONNECTION_STRING = os.getenv('NEON_CONNECTION_STRING')

print("Testing Neon connection...")
print(f"Connection string: {CONNECTION_STRING[:50]}...")

try:
    # Try direct psycopg2 connection
    conn = psycopg2.connect(CONNECTION_STRING)
    cursor = conn.cursor()
    
    # Simple query
    cursor.execute("SELECT COUNT(*) FROM status_changes")
    count = cursor.fetchone()[0]
    
    print(f"✅ Success! Connected to Neon database")
    print(f"✅ Total records in status_changes: {count}")
    
    # Test Lawley query
    cursor.execute("""
        SELECT COUNT(DISTINCT pole_number) 
        FROM status_changes 
        WHERE pole_number LIKE 'LAW.%'
    """)
    lawley_count = cursor.fetchone()[0]
    
    print(f"✅ Lawley poles: {lawley_count}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\nTrying alternative connection methods...")
    
    # Try without pooler
    alt_connection = CONNECTION_STRING.replace('-pooler', '')
    print(f"Alternative: {alt_connection[:50]}...")
    
    try:
        conn = psycopg2.connect(alt_connection)
        print("✅ Alternative connection worked!")
        conn.close()
    except Exception as e2:
        print(f"❌ Alternative also failed: {e2}")