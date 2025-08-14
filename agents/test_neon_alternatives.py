#!/usr/bin/env python3
"""
Test alternative Neon connection methods
"""
import os
import socket
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def test_network_connectivity():
    """Test basic network connectivity to Neon"""
    print("🌐 Testing Network Connectivity...")
    print("=" * 50)
    
    hosts_to_test = [
        ("ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech", 5433, "Neon Pooler"),
        ("ep-long-breeze-a9w7xool.gwc.azure.neon.tech", 5432, "Neon Direct"),
        ("google.com", 80, "Google (test internet)"),
    ]
    
    for host, port, name in hosts_to_test:
        try:
            print(f"\n📡 Testing {name} ({host}:{port})...")
            
            # DNS lookup
            ip = socket.gethostbyname(host)
            print(f"   ✅ DNS resolved to: {ip}")
            
            # Try to connect
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result == 0:
                print(f"   ✅ Port {port} is reachable!")
            else:
                print(f"   ❌ Port {port} is NOT reachable (error code: {result})")
                
        except socket.gaierror:
            print(f"   ❌ DNS lookup failed")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")


def check_alternative_connections():
    """Check different connection string formats"""
    print("\n\n🔧 Alternative Connection Strings...")
    print("=" * 50)
    
    base_string = os.getenv('NEON_CONNECTION_STRING')
    if not base_string:
        print("❌ No connection string found")
        return
    
    # Extract components
    import re
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+)', base_string)
    if match:
        user, password, host, database = match.groups()
        
        alternatives = [
            {
                "name": "Direct connection (no pooler)",
                "url": f"postgresql://{user}:{password}@{host.replace('-pooler', '')}/neondb?sslmode=require"
            },
            {
                "name": "Without SSL",
                "url": f"postgresql://{user}:{password}@{host}/neondb"
            },
            {
                "name": "With options",
                "url": f"postgresql://{user}:{password}@{host}/neondb?sslmode=require&connect_timeout=10&application_name=fibreflow"
            }
        ]
        
        print("📋 Current connection string (masked):")
        masked = base_string.replace(password, "****")
        print(f"   {masked}")
        
        print("\n💡 Alternative formats to try:")
        for alt in alternatives:
            masked_alt = alt["url"].replace(password, "****")
            print(f"\n   {alt['name']}:")
            print(f"   {masked_alt}")


def suggest_solutions():
    """Suggest solutions based on common issues"""
    print("\n\n💡 Troubleshooting Steps...")
    print("=" * 50)
    
    print("""
1. **Check Neon Console**:
   - Go to https://console.neon.tech
   - Make sure database is not suspended
   - Click "Wake up" if needed
   
2. **Check Connection Details**:
   - Verify endpoint ID: ep-long-breeze-a9w7xool
   - Check if using pooler or direct connection
   - Ensure password hasn't changed
   
3. **Network Issues**:
   - Try from a different network
   - Check if VPN is blocking connection
   - Disable firewall temporarily
   
4. **Test with psql**:
   ```bash
   psql "postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require"
   ```
   
5. **Use Neon CLI**:
   ```bash
   npm install -g @neon/cli
   neon connection-string ep-long-breeze-a9w7xool
   ```
""")


if __name__ == "__main__":
    print("🚀 Neon Connection Diagnostics")
    print("=" * 50)
    
    test_network_connectivity()
    check_alternative_connections()
    suggest_solutions()
    
    print("\n" + "=" * 50)
    print("Diagnostics complete!")