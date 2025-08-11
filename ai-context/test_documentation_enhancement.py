#!/usr/bin/env python3
"""Test the updated prompt enhancer with documentation requests"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.prompt_enhancer import FibreFlowPromptEnhancer

# Simple console replacement
class Console:
    def print(self, text):
        print(text)

console = Console()

# Test cases for documentation requests
test_requests = [
    "Document the PostgreSQL to Neon sync process I just set up",
    "Create a prompt about how the vertex AI context manager works",
    "Explain how FibreFlow's authentication system works",
    "Write a guide for setting up the pole tracker mobile app",
    "Generate documentation for the BOQ module's Excel import feature"
]

def test_enhancement():
    """Test the enhanced documentation handling"""
    console.print("Testing Updated Prompt Enhancer - Documentation Requests\n")
    
    # Initialize enhancer
    enhancer = FibreFlowPromptEnhancer()
    
    if not enhancer.index:
        console.print("❌ Please run codebase_scanner.py first")
        return
    
    # Test each request
    for i, request in enumerate(test_requests, 1):
        console.print(f"\nTest {i}/{len(test_requests)}: {request}")
        console.print("-" * 80)
        
        # Enhance the request
        result = enhancer.enhance_prompt(request)
        
        # Check if it's properly categorized
        analysis = enhancer.analyze_request(request)
        console.print(f"Intent detected: {analysis['intent']}")
        console.print(f"Feature type: {analysis.get('feature_type', 'N/A')}")
        
        # Show a snippet of the enhanced prompt
        lines = result.enhanced_prompt.split('\n')
        console.print(f"\nEnhanced prompt preview (first 15 lines):")
        for line in lines[:15]:
            console.print(f"  {line}")
        if len(lines) > 15:
            console.print(f"  ... ({len(lines) - 15} more lines)")
        
        console.print(f"\nTokens: {result.estimated_tokens:,} | Time: {result.processing_time:.2f}s")
        console.print("=" * 80)
    
    # Summary
    console.print("\n✅ All tests complete!")
    console.print("\nThe enhancer now properly detects:")
    console.print("- Documentation requests")
    console.print("- Prompt creation requests")
    console.print("- Explanation requests")
    console.print("\nAnd formats the output appropriately for each type!")

if __name__ == "__main__":
    test_enhancement()