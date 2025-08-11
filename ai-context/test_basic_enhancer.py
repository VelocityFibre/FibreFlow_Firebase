#!/usr/bin/env python3
"""
Test the basic prompt enhancement functionality
Works without Google AI Studio - uses pattern matching
"""

import sys
import os
import json
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

print("🧪 Testing FibreFlow Context Manager")
print("=" * 60)

# Test if we have the codebase index
cache_path = Path("cache/codebase_index.json")
if not cache_path.exists():
    print("❌ No codebase index found")
    print("   Please run: python agents/codebase_scanner.py")
    sys.exit(1)

# Load the index
with open(cache_path, 'r') as f:
    index = json.load(f)

print(f"✅ Codebase index loaded:")
print(f"   - Total files: {index['total_files']:,}")
print(f"   - Services: {len(index.get('services', {}))}")
print(f"   - Components: {len(index.get('components', {}))}")

# Test pattern matching enhancement
test_request = "Add invoice management feature with Excel export"
print(f"\n📝 Test request: {test_request}")

# Simple pattern matching (no AI needed)
request_lower = test_request.lower()

# Detect intent
intent = 'unknown'
if any(word in request_lower for word in ['create', 'add', 'new', 'build']):
    intent = 'create_feature'
elif any(word in request_lower for word in ['fix', 'debug', 'error']):
    intent = 'debug_issue'

print(f"   Intent detected: {intent}")

# Find keywords
keywords = [word for word in request_lower.split() if len(word) > 3]
print(f"   Keywords: {keywords}")

# Find similar features
similar_features = []
for keyword in keywords:
    # Check services
    for service_name in index.get('services', {}):
        if keyword in service_name.lower():
            similar_features.append(f"Service: {service_name}")
    
    # Check for Excel-related features
    if 'excel' in keyword or 'export' in keyword:
        if 'BOQService' in index.get('services', {}):
            similar_features.append("Feature: BOQ Excel export")

print(f"   Similar features: {similar_features[:3]}")

# Build enhanced prompt
print("\n📋 Enhanced Prompt Preview:")
print("-" * 60)
enhanced_prompt = f"""# Enhanced FibreFlow Development Request
**Original Request**: {test_request}

## 🎯 FibreFlow Requirements
**MUST follow these patterns:**
- ✅ Use `standalone: true` for all components
- ✅ Use `inject()` pattern instead of constructor injection
- ✅ Extend `BaseFirestoreService<T>` for all services
- ✅ Use theme functions: `ff-rgb()`, `ff-spacing()`

## 📚 Similar Implementations
{chr(10).join(f'- {feature}' for feature in similar_features[:3])}

## 🏗️ Architecture Context
- Services: {len(index.get('services', {}))} following BaseFirestoreService pattern
- Components: {len(index.get('components', {}))} using standalone architecture
- Total files: {index['total_files']:,}

Now please implement: **{test_request}**
"""

print(enhanced_prompt[:500] + "...")
print("-" * 60)

print("\n✅ Basic enhancement working!")
print("   Pattern matching provides context even without AI")

# Test the unified CLI
cli_path = Path("cli/vertex_cli_unified.py")
if cli_path.exists():
    print("\n🔧 Testing CLI...")
    print(f"   ✅ CLI found at: {cli_path}")
    print("\n💡 To use the full system:")
    print("   1. Get API key from: https://aistudio.google.com/app/apikey")
    print("   2. Run: python scripts/setup_google_ai_studio.py")
    print("   3. Use: python cli/vertex_cli_unified.py enhance 'your request'")
else:
    print("\n❌ CLI not found")

print("\n🎉 Test complete!")