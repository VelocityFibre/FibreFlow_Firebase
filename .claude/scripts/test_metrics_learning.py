#!/usr/bin/env python3
"""
Test script for the metrics learning system
Creates sample data and runs analysis to verify everything works
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def create_sample_data():
    """Create sample metrics data for testing"""
    logs_path = Path(__file__).parent.parent / "logs"
    logs_path.mkdir(exist_ok=True)
    
    # Create sample log entries
    sample_logs = []
    tools = ["Read", "Write", "Edit", "Bash", "WebFetch", "Grep", "LS"]
    
    base_time = datetime.now() - timedelta(days=7)
    
    for i in range(200):  # Create 200 sample operations
        tool = random.choice(tools)
        
        # Simulate realistic timing patterns
        if tool == "WebFetch":
            time_ms = random.gauss(6000, 2000)  # Slow with variance
        elif tool == "Bash":
            time_ms = random.gauss(1500, 500)   # Moderate
        else:
            time_ms = random.gauss(800, 300)    # Fast
        
        time_ms = max(100, time_ms)  # Minimum 100ms
        
        # Simulate errors (10% failure rate)
        success = random.random() > 0.1
        error = None
        if not success:
            errors = [
                "File /path/file.txt does not exist",
                "Permission denied accessing /restricted/",
                "Command 'invalidcmd' not found",
                "Connection timeout after 30s",
                "Syntax error in input"
            ]
            error = random.choice(errors)
        
        log_entry = {
            "timestamp": (base_time + timedelta(minutes=i*5)).isoformat(),
            "tool": tool,
            "success": success,
            "time_ms": int(time_ms),
            "category": "filesystem" if tool in ["Read", "Write", "Edit"] else "other"
        }
        
        if error:
            log_entry["error"] = error
        
        # Add validation failures for some entries
        if not success and random.random() < 0.3:
            log_entry["validation_failure"] = {
                "type": "pre_validation",
                "tool": tool,
                "reason": f"Validation failed for {tool} operation"
            }
        
        sample_logs.append(log_entry)
    
    # Save sample logs
    log_file = logs_path / "post_tool_use.json"
    with open(log_file, 'w') as f:
        json.dump(sample_logs, f, indent=2)
    
    print(f"Created {len(sample_logs)} sample log entries")
    return log_file

def run_test():
    """Run the test"""
    print("=" * 50)
    print("Testing Metrics Learning System")
    print("=" * 50)
    
    # Create sample data
    print("\n1. Creating sample data...")
    log_file = create_sample_data()
    
    # Import and run the analyzer
    print("\n2. Running analysis...")
    try:
        from process_metrics_to_learnings import MetricsAnalyzer
        
        analyzer = MetricsAnalyzer()
        analyzer.run_analysis()
        
        print(f"\n3. Analysis complete!")
        print(f"   - Extracted {len(analyzer.learnings)} learnings")
        
        # Show summary by type
        from collections import Counter
        by_type = Counter(l.type for l in analyzer.learnings)
        for ltype, count in by_type.items():
            print(f"   - {ltype}: {count} learnings")
        
        # Show high confidence learnings
        high_conf = [l for l in analyzer.learnings if l.confidence > 0.8]
        print(f"   - High confidence (>80%): {len(high_conf)} learnings")
        
        if high_conf:
            print(f"\n   Example high confidence learning:")
            example = high_conf[0]
            print(f"   - Pattern: {example.pattern}")
            print(f"   - Description: {example.description}")
            print(f"   - Confidence: {example.confidence:.1%}")
            print(f"   - Recommendation: {example.recommendation}")
        
    except ImportError as e:
        print(f"Error importing analyzer: {e}")
        return False
    except Exception as e:
        print(f"Error running analysis: {e}")
        return False
    
    print("\n4. Checking output files...")
    
    # Check if files were created
    logs_path = Path(__file__).parent.parent / "logs"
    expected_files = [
        "extracted_learnings.json",
        "metrics_analysis_report.md"
    ]
    
    for filename in expected_files:
        filepath = logs_path / filename
        if filepath.exists():
            print(f"   ✓ {filename} created")
        else:
            print(f"   ✗ {filename} missing")
    
    print("\n5. Test complete!")
    print("\nTo view results:")
    print(f"   - Human report: cat {logs_path}/metrics_analysis_report.md")
    print(f"   - Machine data: cat {logs_path}/extracted_learnings.json")
    
    return True

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)