#!/usr/bin/env python3
"""
Test Gemini API functionality without database
"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv('.env.local')

def test_gemini_api():
    """Test Gemini API directly"""
    print("🤖 Testing Google Gemini API...")
    
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
    
    if not api_key:
        print("❌ No Gemini API key found")
        return False
    
    try:
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Test simple query
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        response = model.generate_content("""
        You are a data analyst for FibreFlow fiber optic management.
        
        Based on this sample data:
        - 15,651 total records in status_changes table
        - 3,757 poles planted in Lawley (98% completion rate)
        - Statuses include: "Pole Permission: Approved", "Home Sign Ups: Approved"
        
        Answer this question: "How many poles have been planted in Lawley?"
        
        Give a brief, business-focused answer.
        """)
        
        print("✅ Gemini API working!")
        print(f"📊 Response: {response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ Gemini test failed: {e}")
        return False


def test_simple_sql_generation():
    """Test if Gemini can generate SQL"""
    print("\n🔧 Testing SQL Generation...")
    
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        response = model.generate_content("""
        Given a PostgreSQL table called "status_changes" with these columns:
        - pole_number (text): Like 'LAW.P.B167'
        - property_id (text): Property identifier
        - status (text): Current status like "Pole Permission: Approved"
        - agent_name (text): Agent who processed it
        - created_at (timestamp): When record was created
        
        Generate a SQL query to answer: "How many unique poles are there in Lawley?"
        
        Return only the SQL query, nothing else.
        """)
        
        print("✅ SQL Generation working!")
        print(f"🔍 Generated SQL: {response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ SQL generation failed: {e}")
        return False


def main():
    """Run Gemini tests"""
    print("🚀 FibreFlow Gemini API Test")
    print("=" * 40)
    
    success_count = 0
    
    if test_gemini_api():
        success_count += 1
    
    if test_simple_sql_generation():
        success_count += 1
    
    print("\n" + "=" * 40)
    
    if success_count == 2:
        print("✅ All Gemini tests passed!")
        print("🔗 Ready to integrate with existing dev panel")
    else:
        print(f"⚠️  {success_count}/2 tests passed")
    
    return success_count == 2


if __name__ == "__main__":
    main()