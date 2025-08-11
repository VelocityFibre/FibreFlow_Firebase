#!/usr/bin/env python3
"""
Setup script for switching from Vertex AI to Google AI Studio
Cheaper access to the same Gemini models!
"""

import os
import sys
from pathlib import Path

def setup_google_ai_studio():
    print("🚀 Setting up Google AI Studio for FibreFlow")
    print("=" * 60)
    
    print("\n💰 Why Google AI Studio?")
    print("- Same Gemini 1.5 Pro model as Vertex AI")
    print("- FREE tier: 50 requests/day with 1M token context")
    print("- 50-90% cheaper than Vertex AI for paid usage")
    print("- Simpler setup (just an API key)")
    
    print("\n📝 Step 1: Get your API key")
    print("1. Visit: https://aistudio.google.com/app/apikey")
    print("2. Click 'Create API key'")
    print("3. Select your Google Cloud project (or create new)")
    print("4. Copy the API key")
    
    api_key = input("\n🔑 Paste your API key here (or press Enter to skip): ").strip()
    
    # Create .env.local if it doesn't exist
    env_file = Path(".env.local")
    
    if api_key:
        # Read existing env or create new
        if env_file.exists():
            with open(env_file, 'r') as f:
                content = f.read()
            
            # Update or add API key
            if 'GOOGLE_AI_STUDIO_API_KEY' in content:
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if line.startswith('GOOGLE_AI_STUDIO_API_KEY'):
                        lines[i] = f'GOOGLE_AI_STUDIO_API_KEY={api_key}'
                        break
                content = '\n'.join(lines)
            else:
                content += f'\n\n# Google AI Studio (Free Gemini access!)\nGOOGLE_AI_STUDIO_API_KEY={api_key}\n'
        else:
            content = f"""# Google AI Studio Configuration
GOOGLE_AI_STUDIO_API_KEY={api_key}

# Model Selection
GEMINI_MODEL=gemini-1.5-pro

# Cost Control
DAILY_REQUEST_LIMIT=50
CACHE_ENABLED=true
CACHE_TTL=3600
"""
        
        with open(env_file, 'w') as f:
            f.write(content)
        
        print("\n✅ API key saved to .env.local")
    else:
        print("\n⚠️  No API key provided. Add it later to .env.local")
    
    print("\n📦 Step 2: Install Google AI Python SDK")
    print("Run: pip install google-generativeai")
    
    response = input("\nInstall now? (y/n): ").lower()
    if response == 'y':
        os.system("pip install google-generativeai")
        print("✅ Google AI SDK installed")
    
    print("\n🔧 Step 3: Update your code")
    print("The new prompt enhancer is ready at:")
    print("  agents/prompt_enhancer_gemini.py")
    
    print("\n📊 Usage Tracking")
    print("- Free tier: 50 requests/day")
    print("- Usage tracked in: cache/daily_usage.json")
    print("- Automatic fallback to pattern matching after limit")
    
    print("\n🎯 Quick Test")
    print("Run: python agents/prompt_enhancer_gemini.py")
    
    print("\n💡 Cost Comparison:")
    print("┌─────────────────┬──────────────┬─────────────┐")
    print("│ Service         │ Input Cost   │ Daily Cost  │")
    print("├─────────────────┼──────────────┼─────────────┤")
    print("│ Vertex AI       │ $3.50-7/1M   │ $2-4        │")
    print("│ AI Studio Free  │ $0           │ $0          │")
    print("│ AI Studio Paid  │ $0.15/1M     │ $0.10-0.30  │")
    print("└─────────────────┴──────────────┴─────────────┘")
    
    print("\n✨ You're ready to use Google AI Studio!")
    print("Same powerful Gemini models, much cheaper!")

if __name__ == "__main__":
    setup_google_ai_studio()