#!/usr/bin/env python3
"""
Integration script to load extracted learnings into the context manager
This bridges the metrics analysis with the context system
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from context_manager import ContextManager
    HAS_CONTEXT_MANAGER = True
except ImportError:
    print("Warning: ContextManager not available. Cannot integrate learnings.")
    HAS_CONTEXT_MANAGER = False


def load_latest_learnings() -> Dict[str, Any]:
    """Load the latest extracted learnings"""
    learnings_path = Path(__file__).parent.parent / "logs" / "extracted_learnings.json"
    
    if not learnings_path.exists():
        print("No learnings file found. Run process_metrics_to_learnings.py first.")
        return {}
    
    with open(learnings_path, 'r') as f:
        return json.load(f)


def integrate_learnings(learnings_data: Dict[str, Any]) -> int:
    """Integrate learnings into context manager"""
    if not HAS_CONTEXT_MANAGER:
        return 0
    
    cm = ContextManager()
    added_count = 0
    
    for learning in learnings_data.get('learnings', []):
        # Only add high-confidence learnings
        if learning.get('confidence', 0) < 0.6:
            continue
        
        # Create category based on type and impact
        category = f"metrics_{learning['type']}"
        if learning.get('impact') == 'high':
            category += "_high_impact"
        
        try:
            cm.add_learning(
                category=category,
                pattern=learning['pattern'],
                solution=learning['recommendation'],
                confidence=learning['confidence'],
                metadata={
                    'description': learning['description'],
                    'impact': learning.get('impact', 'medium'),
                    'metrics': learning.get('metrics', {}),
                    'examples': learning.get('examples', []),
                    'learning_type': learning['type'],
                    'extracted_at': learning.get('timestamp'),
                    'source': 'metrics_processor'
                }
            )
            added_count += 1
            print(f"Added: {learning['pattern']} (confidence: {learning['confidence']:.1%})")
            
        except Exception as e:
            print(f"Failed to add learning {learning['pattern']}: {e}")
    
    return added_count


def show_integration_summary(learnings_data: Dict[str, Any], added_count: int):
    """Show summary of integration results"""
    total_learnings = len(learnings_data.get('learnings', []))
    summary = learnings_data.get('summary', {})
    
    print("\n" + "="*50)
    print("INTEGRATION SUMMARY")
    print("="*50)
    print(f"Total learnings extracted: {total_learnings}")
    print(f"High confidence learnings: {summary.get('high_confidence', 0)}")
    print(f"Added to context manager: {added_count}")
    
    if total_learnings > 0:
        print(f"Integration rate: {added_count/total_learnings:.1%}")
    
    print("\nLearnings by type:")
    by_type = summary.get('by_type', {})
    for ltype, count in by_type.items():
        print(f"  - {ltype}: {count}")
    
    print("\nLearnings by impact:")
    by_impact = summary.get('by_impact', {})
    for impact, count in by_impact.items():
        print(f"  - {impact}: {count}")


def main():
    """Main integration function"""
    print("Loading extracted learnings...")
    learnings_data = load_latest_learnings()
    
    if not learnings_data:
        print("No learnings to integrate.")
        return
    
    print(f"Found {len(learnings_data.get('learnings', []))} learnings")
    
    if HAS_CONTEXT_MANAGER:
        print("Integrating with context manager...")
        added_count = integrate_learnings(learnings_data)
        
        if added_count > 0:
            print(f"Successfully integrated {added_count} learnings")
        else:
            print("No learnings met the confidence threshold (≥60%)")
    else:
        added_count = 0
        print("Context manager not available - skipping integration")
    
    show_integration_summary(learnings_data, added_count)


if __name__ == "__main__":
    main()