#!/usr/bin/env python3
"""
Simple Gemini setup script
No interactive input needed - just edit the .env.local file
"""

import os
from pathlib import Path

def check_setup():
    """Check if Gemini is set up correctly"""
    print("🔍 Checking Google AI Studio (Gemini) Setup")
    print("=" * 50)
    
    # Check for .env.local
    env_file = Path(".env.local")
    if not env_file.exists():
        print("\n❌ No .env.local file found!")
        print("\n📝 To set up:")
        print("1. Create .env.local file:")
        print("   nano .env.local")
        print("\n2. Add your API key:")
        print("   GOOGLE_AI_STUDIO_API_KEY=AIzaSy_YOUR_KEY_HERE")
        print("\n3. Get your key from:")
        print("   https://aistudio.google.com/app/apikey")
        return False
    
    # Try to load the key
    try:
        with open(".env.local", 'r') as f:
            content = f.read()
        
        if 'GOOGLE_AI_STUDIO_API_KEY=' in content:
            # Extract the key (basic parsing)
            for line in content.split('\n'):
                if line.startswith('GOOGLE_AI_STUDIO_API_KEY='):
                    key = line.split('=', 1)[1].strip()
                    if key and key != 'your-api-key-here' and key.startswith('AIza'):
                        print("✅ API key found and looks valid!")
                        print(f"   Key starts with: {key[:8]}...")
                        return True
                    else:
                        print("⚠️  API key found but looks invalid")
                        print("   Make sure to replace with your actual key")
                        return False
        else:
            print("❌ No API key found in .env.local")
            print("   Add: GOOGLE_AI_STUDIO_API_KEY=your-key")
            return False
            
    except Exception as e:
        print(f"❌ Error reading .env.local: {e}")
        return False

def test_import():
    """Test if google-generativeai is installed"""
    print("\n📦 Checking Python package...")
    try:
        import google.generativeai as genai
        print("✅ google-generativeai is installed!")
        return True
    except ImportError:
        print("❌ google-generativeai not installed")
        print("\nTo install:")
        print("1. Try: pip install --user google-generativeai")
        print("2. Or: pipx install google-generativeai")
        print("3. Or create venv: python -m venv venv && source venv/bin/activate && pip install google-generativeai")
        return False

def test_connection():
    """Test actual connection to Gemini"""
    print("\n🌐 Testing Gemini connection...")
    
    # Load environment
    from dotenv import load_dotenv
    load_dotenv('.env.local')
    
    api_key = os.getenv('GOOGLE_AI_STUDIO_API_KEY')
    if not api_key or api_key == 'your-api-key-here':
        print("❌ No valid API key in environment")
        return False
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Test with a simple prompt
        model = genai.GenerativeModel('gemini-1.5-flash')  # Use Flash for quick test
        response = model.generate_content("Say 'Hello from Gemini!'")
        
        print("✅ Gemini connection successful!")
        print(f"   Response: {response.text.strip()}")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)[:100]}...")
        if "API_KEY_INVALID" in str(e):
            print("\n⚠️  Your API key is invalid. Please check it.")
        elif "RATE_LIMIT_EXCEEDED" in str(e):
            print("\n⚠️  Rate limit exceeded. You've used your free quota.")
        return False

def main():
    """Run all checks"""
    print("🚀 Google AI Studio (Gemini) Setup Checker")
    print("This gives you 50 FREE requests/day with 1M token context!")
    print("=" * 50)
    
    # Run checks
    has_env = check_setup()
    has_package = test_import()
    
    if has_env and has_package:
        test_connection()
    
    print("\n" + "=" * 50)
    if has_env and has_package:
        print("🎉 Setup complete! You can now use:")
        print("   python cli/ai_cli.py enhance \"your request\"")
        print("\n💡 You get 50 free requests per day!")
    else:
        print("❌ Setup incomplete. Follow the steps above.")
        print("\n📖 Full guide: cat SETUP_GEMINI.md")

if __name__ == "__main__":
    main()