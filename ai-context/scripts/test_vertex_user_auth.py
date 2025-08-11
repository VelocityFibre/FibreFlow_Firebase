#!/usr/bin/env python3
"""Test Vertex AI with user authentication (no service account)"""

import os
import sys

print("🔍 Testing Vertex AI with User Authentication")
print("=" * 50)

# Temporarily unset service account to use user auth
if 'GOOGLE_APPLICATION_CREDENTIALS' in os.environ:
    print("📌 Temporarily unsetting GOOGLE_APPLICATION_CREDENTIALS")
    del os.environ['GOOGLE_APPLICATION_CREDENTIALS']

# Set project explicitly
os.environ['GOOGLE_CLOUD_PROJECT'] = 'fibreflow-73daf'

print("\n1️⃣ Using user authentication (no service account)")

try:
    from google.cloud import aiplatform
    from vertexai.generative_models import GenerativeModel
    
    print("2️⃣ Initializing Vertex AI with project: fibreflow-73daf")
    aiplatform.init(project='fibreflow-73daf', location='us-central1')
    
    print("3️⃣ Testing Gemini Pro model (newer API)...")
    
    # Try the newer Gemini models
    model = GenerativeModel('gemini-1.5-flash')
    
    print("4️⃣ Sending test prompt...")
    response = model.generate_content("Say 'Hello from Vertex AI!'")
    
    print(f"✅ SUCCESS! Response: {response.text}")
    print("\n🎉 Vertex AI is working with your user authentication!")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    
    # Try older approach
    print("\n5️⃣ Trying older text-bison model...")
    try:
        from vertexai.language_models import TextGenerationModel
        model = TextGenerationModel.from_pretrained("text-bison")
        response = model.predict("Say 'Hello from Vertex AI!'", max_output_tokens=50)
        print(f"✅ SUCCESS with text-bison! Response: {response.text}")
    except Exception as e2:
        print(f"❌ Also failed: {str(e2)}")
        
        print("\n💡 This likely means:")
        print("   1. Billing is not enabled for fibreflow-73daf")
        print("   2. You need to enable billing at: https://console.cloud.google.com/billing")
        print("   3. Vertex AI requires an active billing account")

print("\n" + "=" * 50)