#!/usr/bin/env python3
"""
Test script to verify the basic setup is working
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from config import settings, FORBIDDEN_SQL_PATTERNS
from security import validate_query_security
from database import create_readonly_user_script

def test_configuration():
    """Test configuration loading"""
    print("🔧 Testing Configuration...")
    
    try:
        print(f"   ✅ Environment: {settings.environment}")
        print(f"   ✅ Debug mode: {settings.debug}")
        print(f"   ✅ API Port: {settings.api_port}")
        print(f"   ✅ Whitelisted tables: {len(settings.whitelisted_tables)} tables")
        print(f"   ✅ Max query results: {settings.max_query_results}")
        return True
    except Exception as e:
        print(f"   ❌ Configuration test failed: {e}")
        return False

def test_security():
    """Test security validation"""
    print("\n🛡️  Testing Security Validation...")
    
    test_cases = [
        ("SELECT * FROM projects", True, "Valid SELECT query"),
        ("DROP TABLE projects", False, "Should block DROP operations"),
        ("DELETE FROM projects", False, "Should block DELETE operations"),
        ("SELECT * FROM unauthorized_table", False, "Should block unauthorized tables"),
        ("", False, "Should reject empty queries"),
    ]
    
    passed = 0
    total = len(test_cases)
    
    for query, should_pass, description in test_cases:
        try:
            is_valid, sanitized_or_error, message = validate_query_security(query)
            
            if is_valid == should_pass:
                print(f"   ✅ {description}")
                passed += 1
            else:
                print(f"   ❌ {description} - Expected {should_pass}, got {is_valid}")
                
        except Exception as e:
            print(f"   ❌ {description} - Exception: {e}")
    
    print(f"\n   Security tests: {passed}/{total} passed")
    return passed == total

def test_database_script():
    """Test database setup script generation"""
    print("\n🗄️  Testing Database Setup...")
    
    try:
        script = create_readonly_user_script()
        
        if "CREATE USER ai_agent" in script:
            print("   ✅ Read-only user creation script generated")
            return True
        else:
            print("   ❌ Invalid database setup script")
            return False
            
    except Exception as e:
        print(f"   ❌ Database script test failed: {e}")
        return False

def show_next_steps():
    """Show next steps for the user"""
    print("\n📋 Next Steps:")
    print("   1. Copy .env.template to .env.local")
    print("   2. Fill in your OpenAI API key and Neon connection details")
    print("   3. Run the database setup script in your Neon console")
    print("   4. Proceed to Stage 1.3: Basic LangChain Agent Implementation")

def main():
    """Run all tests"""
    print("🚀 FibreFlow Neon Query Agent - Setup Verification")
    print("=" * 60)
    
    all_passed = True
    
    all_passed &= test_configuration()
    all_passed &= test_security()
    all_passed &= test_database_script()
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✅ All tests passed! Setup is ready.")
        show_next_steps()
    else:
        print("❌ Some tests failed. Please check the configuration.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())