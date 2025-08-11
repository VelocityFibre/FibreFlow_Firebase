#!/usr/bin/env python3
"""Test Vertex AI connection and diagnose issues"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env.local")

print("🔍 Vertex AI Connection Diagnostics")
print("=" * 50)

# Check environment
print("\n1️⃣ Environment Variables:")
print(f"   GOOGLE_CLOUD_PROJECT: {os.getenv('GOOGLE_CLOUD_PROJECT', 'NOT SET')}")
print(f"   VERTEX_AI_LOCATION: {os.getenv('VERTEX_AI_LOCATION', 'NOT SET')}")
print(f"   GOOGLE_APPLICATION_CREDENTIALS: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'NOT SET')}")

# Check gcloud config
print("\n2️⃣ Google Cloud Configuration:")
import subprocess
try:
    result = subprocess.run(['gcloud', 'config', 'get-value', 'project'], 
                          capture_output=True, text=True)
    print(f"   Current project: {result.stdout.strip()}")
except Exception as e:
    print(f"   Error getting project: {e}")

# Try to import and initialize
print("\n3️⃣ Testing Vertex AI Import:")
try:
    from google.cloud import aiplatform
    print("   ✅ Import successful")
    
    # Get project ID
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'fibreflow-73daf')
    location = os.getenv('VERTEX_AI_LOCATION', 'us-central1')
    
    print(f"\n4️⃣ Initializing Vertex AI:")
    print(f"   Project: {project_id}")
    print(f"   Location: {location}")
    
    # Initialize
    aiplatform.init(project=project_id, location=location)
    print("   ✅ Initialization successful")
    
    # Try to use a model
    print("\n5️⃣ Testing Model Access:")
    from vertexai.language_models import TextGenerationModel
    
    # Try different model names
    model_names = [
        "text-bison@002",
        "text-bison@001", 
        "text-bison",
        "gemini-pro",
        "gemini-1.0-pro"
    ]
    
    for model_name in model_names:
        try:
            print(f"   Trying model: {model_name}...", end=" ")
            model = TextGenerationModel.from_pretrained(model_name)
            print("✅ SUCCESS!")
            
            # Test prediction
            print("\n6️⃣ Testing Prediction:")
            response = model.predict(
                "Say 'Hello from Vertex AI!'",
                temperature=0.1,
                max_output_tokens=50,
            )
            print(f"   Response: {response.text}")
            print("\n🎉 Vertex AI is working!")
            break
            
        except Exception as e:
            print(f"❌ Failed: {str(e)[:50]}...")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    print("\n💡 Possible solutions:")
    print("   1. Check if billing is enabled for your project")
    print("   2. Verify you're using the correct project ID")
    print("   3. Try setting GOOGLE_APPLICATION_CREDENTIALS")
    print("   4. Run: gcloud auth application-default login")

print("\n" + "=" * 50)
print("Diagnostics complete!")