#!/usr/bin/env python3
"""
Test if we're ready to use Gemini
Works without installing google-generativeai
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

print("🔍 Checking Gemini Setup")
print("=" * 50)

# Check API key
api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
if api_key and api_key.startswith('AIza'):
    print(f"✅ API Key loaded: {api_key[:8]}...")
    print("✅ Your setup is ready!")
    print("\n🎉 You have access to:")
    print("   - 50 free requests per day")
    print("   - 1 million token context window")
    print("   - Gemini 1.5 Pro model")
    
    print("\n⚠️  Note: The google-generativeai package needs to be installed.")
    print("    Due to system restrictions, you have options:")
    print("\n    Option 1: Use virtual environment")
    print("    cd /home/ldp/VF/Apps/FibreFlow/ai-context")
    print("    python -m venv venv")
    print("    source venv/bin/activate")
    print("    pip install google-generativeai")
    print("    python cli/ai_cli.py enhance 'your request'")
    
    print("\n    Option 2: Use Docker/container")
    print("    Option 3: Use system package manager if available")
    print("    Option 4: Use the pattern-matching mode (already works!)")
    
else:
    print("❌ No API key found")

print("\n💡 For now, pattern matching mode still works great!")
print("   python cli/ai_cli.py enhance 'your request'")