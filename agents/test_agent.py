#!/usr/bin/env python3
"""
Test the basic FibreFlow Query Agent functionality
This test works without needing real database credentials
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import logging
from unittest.mock import Mock, patch
from agent import FibreFlowQueryAgent, get_agent, process_question

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_agent_initialization():
    """Test that the agent can be initialized without real credentials"""
    print("🤖 Testing Agent Initialization...")
    
    try:
        # Mock the database and LLM components to avoid needing real credentials
        with patch('agent.get_db') as mock_db, \
             patch('agent.get_security_manager') as mock_security, \
             patch('agent.ChatOpenAI') as mock_llm, \
             patch('agent.create_sql_agent') as mock_agent:
            
            # Set up mocks
            mock_db_instance = Mock()
            mock_db.return_value = mock_db_instance
            mock_db_instance.get_database.return_value = Mock()
            
            mock_security_instance = Mock()
            mock_security.return_value = mock_security_instance
            
            mock_llm_instance = Mock()
            mock_llm.return_value = mock_llm_instance
            
            mock_agent_instance = Mock()
            mock_agent.return_value = mock_agent_instance
            
            # Try to create agent
            agent = FibreFlowQueryAgent()
            
            print("   ✅ Agent initialized successfully")
            print(f"   ✅ Database connection: {mock_db.called}")
            print(f"   ✅ Security manager: {mock_security.called}")
            print(f"   ✅ LLM creation: {mock_llm.called}")
            print(f"   ✅ SQL agent creation: {mock_agent.called}")
            
            return True
            
    except Exception as e:
        print(f"   ❌ Agent initialization failed: {e}")
        return False


def test_agent_components():
    """Test individual agent components"""
    print("\n🔧 Testing Agent Components...")
    
    try:
        # Test query validation logic
        from security import validate_query_security
        
        # Test a valid query
        is_valid, result, message = validate_query_security("SELECT COUNT(*) FROM projects")
        
        if is_valid:
            print("   ✅ Query validation working")
        else:
            print(f"   ❌ Query validation failed: {message}")
            return False
        
        # Test configuration
        from config import settings
        
        if settings.whitelisted_tables:
            print(f"   ✅ Configuration loaded: {len(settings.whitelisted_tables)} whitelisted tables")
        else:
            print("   ❌ Configuration not loaded properly")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Component test failed: {e}")
        return False


def test_question_enhancement():
    """Test the question enhancement functionality"""
    print("\n📝 Testing Question Enhancement...")
    
    try:
        # Mock the agent to test question enhancement
        with patch('agent.get_db'), \
             patch('agent.get_security_manager'), \
             patch('agent.ChatOpenAI'), \
             patch('agent.create_sql_agent'):
            
            agent = FibreFlowQueryAgent()
            
            # Test question enhancement
            original_question = "How many projects do we have?"
            enhanced = agent._enhance_question_context(original_question)
            
            if "FibreFlow" in enhanced and "fiber optic" in enhanced:
                print("   ✅ Question enhancement working")
                print(f"   ✅ Enhanced question length: {len(enhanced)} characters")
                return True
            else:
                print("   ❌ Question enhancement not working properly")
                return False
                
    except Exception as e:
        print(f"   ❌ Question enhancement test failed: {e}")
        return False


def test_error_handling():
    """Test error handling capabilities"""
    print("\n⚠️  Testing Error Handling...")
    
    try:
        # Mock agent with error scenarios
        with patch('agent.get_db'), \
             patch('agent.get_security_manager'), \
             patch('agent.ChatOpenAI'), \
             patch('agent.create_sql_agent'):
            
            agent = FibreFlowQueryAgent()
            
            # Test empty question
            result = agent._create_error_response("Test error", 0)
            
            if not result["success"] and "error" in result:
                print("   ✅ Error response structure correct")
            else:
                print("   ❌ Error response structure incorrect")
                return False
            
            # Test question validation
            empty_question_result = agent.query("")
            
            if not empty_question_result["success"] and "empty" in empty_question_result["error"].lower():
                print("   ✅ Empty question validation working")
            else:
                print("   ❌ Empty question validation not working")
                return False
                
            return True
            
    except Exception as e:
        print(f"   ❌ Error handling test failed: {e}")
        return False


def show_next_steps():
    """Show what to do next"""
    print("\n📋 Next Steps:")
    print("   1. Add real OpenAI API key to .env.local")
    print("   2. Add real Neon database connection string")
    print("   3. Create the read-only user in your Neon database")
    print("   4. Test with real database: python test_agent_real.py")
    print("   5. Create FastAPI endpoints for FibreFlow integration")


def main():
    """Run all tests"""
    print("🚀 FibreFlow Query Agent - Basic Functionality Test")
    print("=" * 60)
    
    all_passed = True
    
    all_passed &= test_agent_initialization()
    all_passed &= test_agent_components()
    all_passed &= test_question_enhancement()
    all_passed &= test_error_handling()
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✅ All basic tests passed! Agent structure is correct.")
        show_next_steps()
    else:
        print("❌ Some tests failed. Please check the implementation.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())