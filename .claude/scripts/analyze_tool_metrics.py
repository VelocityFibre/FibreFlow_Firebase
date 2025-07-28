#!/usr/bin/env python3
"""
Analyze tool metrics captured by post_tool_use hook
Exports patterns and learnings for context manager
"""

import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List
from collections import defaultdict

def load_analytics():
    """Load analytics data from tool_analytics.json"""
    analytics_path = Path(__file__).parent.parent / "logs" / "tool_analytics.json"
    
    if not analytics_path.exists():
        print("No analytics data found yet. Run some operations first.")
        return {}
    
    with open(analytics_path, 'r') as f:
        return json.load(f)

def load_main_logs():
    """Load main operation logs"""
    log_path = Path(__file__).parent.parent / "logs" / "post_tool_use.json"
    
    if not log_path.exists():
        return []
    
    with open(log_path, 'r') as f:
        return json.load(f)

def extract_performance_learnings(analytics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract performance patterns as learnings"""
    learnings = []
    
    # Get latest analytics
    if not analytics:
        return learnings
    
    latest_key = sorted(analytics.keys())[-1]
    latest = analytics[latest_key]
    
    # Slow operations pattern
    if latest.get("performance", {}).get("slow_operations"):
        slow_tools = defaultdict(list)
        for op in latest["performance"]["slow_operations"]:
            slow_tools[op["tool"]].append(op["time_ms"])
        
        for tool, times in slow_tools.items():
            avg_time = sum(times) / len(times)
            learnings.append({
                "type": "performance_pattern",
                "pattern": f"{tool}_slow_operation",
                "description": f"{tool} operations averaging {avg_time:.0f}ms (>{SLOW_THRESHOLD}ms)",
                "occurrences": len(times),
                "confidence": 0.9 if len(times) > 5 else 0.7,
                "recommendation": f"Consider optimizing {tool} operations or adding progress indicators",
                "measurable": True,
                "metrics": {
                    "avg_ms": avg_time,
                    "max_ms": max(times),
                    "threshold_ms": 5000
                }
            })
    
    # Tool performance trends
    if latest.get("performance", {}).get("performance_trends"):
        for tool, metrics in latest["performance"]["performance_trends"].items():
            if metrics["avg_ms"] > 1000:  # Tools averaging over 1 second
                learnings.append({
                    "type": "performance_baseline",
                    "tool": tool,
                    "metrics": metrics,
                    "measurable": True
                })
    
    return learnings

def extract_error_learnings(analytics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract error patterns as learnings"""
    learnings = []
    
    if not analytics:
        return learnings
    
    latest_key = sorted(analytics.keys())[-1]
    latest = analytics[latest_key]
    
    # Error patterns
    if latest.get("errors", {}).get("error_patterns"):
        for pattern in latest["errors"]["error_patterns"]:
            learnings.append({
                "type": "error_pattern",
                "pattern": pattern["pattern"],
                "occurrences": pattern["occurrences"],
                "percentage": pattern["percentage"],
                "confidence": min(0.9, pattern["occurrences"] / 10),  # Higher occurrences = higher confidence
                "measurable": True,
                "recommendation": f"Implement specific handling for {pattern['pattern']} errors"
            })
    
    return learnings

def extract_sequence_learnings(analytics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract tool sequence patterns as learnings"""
    learnings = []
    
    if not analytics:
        return learnings
    
    latest_key = sorted(analytics.keys())[-1]
    latest = analytics[latest_key]
    
    # Common sequences
    if latest.get("sequences", {}).get("common_sequences"):
        for seq in latest["sequences"]["common_sequences"][:5]:  # Top 5 sequences
            learnings.append({
                "type": "tool_sequence_pattern",
                "sequence": seq["sequence"],
                "pattern": seq["pattern"],
                "count": seq["count"],
                "confidence": min(0.9, seq["count"] / 20),
                "measurable": True,
                "use_case": "Optimize for this common workflow"
            })
    
    return learnings

def extract_validation_learnings(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract validation failure patterns"""
    learnings = []
    validation_failures = defaultdict(list)
    
    for log in logs[-1000:]:  # Last 1000 operations
        if log.get("validation_failure"):
            vf = log["validation_failure"]
            key = f"{vf['type']}_{vf['tool']}"
            validation_failures[key].append({
                "reason": vf["reason"],
                "timestamp": log["timestamp"]
            })
    
    for key, failures in validation_failures.items():
        if len(failures) >= 3:  # At least 3 occurrences
            learnings.append({
                "type": "validation_pattern",
                "pattern": key,
                "occurrences": len(failures),
                "confidence": min(0.9, len(failures) / 10),
                "measurable": True,
                "common_reasons": list(set(f["reason"][:50] for f in failures))[:3]
            })
    
    return learnings

def generate_context_manager_format(learnings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format learnings for context manager consumption"""
    return {
        "timestamp": datetime.now().isoformat(),
        "source": "tool_metrics_analysis",
        "learnings": {
            "performance_patterns": [l for l in learnings if l["type"] in ["performance_pattern", "performance_baseline"]],
            "error_patterns": [l for l in learnings if l["type"] == "error_pattern"],
            "sequence_patterns": [l for l in learnings if l["type"] == "tool_sequence_pattern"],
            "validation_patterns": [l for l in learnings if l["type"] == "validation_pattern"]
        },
        "summary": {
            "total_patterns": len(learnings),
            "high_confidence_patterns": len([l for l in learnings if l.get("confidence", 0) > 0.8]),
            "measurable_patterns": len([l for l in learnings if l.get("measurable", False)])
        }
    }

def save_learnings_for_context(data: Dict[str, Any]):
    """Save learnings in format ready for context manager"""
    output_path = Path(__file__).parent.parent / "logs" / "tool_learnings.json"
    
    # Load existing learnings
    existing = []
    if output_path.exists():
        with open(output_path, 'r') as f:
            existing = json.load(f)
    
    existing.append(data)
    
    # Keep last 50 analyses
    if len(existing) > 50:
        existing = existing[-50:]
    
    with open(output_path, 'w') as f:
        json.dump(existing, f, indent=2)
    
    print(f"Saved learnings to: {output_path}")

def main():
    """Main analysis function"""
    print("Analyzing tool metrics...")
    
    # Load data
    analytics = load_analytics()
    logs = load_main_logs()
    
    if not analytics and not logs:
        print("No data to analyze yet.")
        return
    
    # Extract learnings
    all_learnings = []
    all_learnings.extend(extract_performance_learnings(analytics))
    all_learnings.extend(extract_error_learnings(analytics))
    all_learnings.extend(extract_sequence_learnings(analytics))
    all_learnings.extend(extract_validation_learnings(logs))
    
    # Format for context manager
    context_data = generate_context_manager_format(all_learnings)
    
    # Display summary
    print(f"\nFound {len(all_learnings)} patterns:")
    print(f"- Performance patterns: {len(context_data['learnings']['performance_patterns'])}")
    print(f"- Error patterns: {len(context_data['learnings']['error_patterns'])}")
    print(f"- Sequence patterns: {len(context_data['learnings']['sequence_patterns'])}")
    print(f"- Validation patterns: {len(context_data['learnings']['validation_patterns'])}")
    
    # Show examples
    if context_data['learnings']['performance_patterns']:
        print("\nExample performance pattern:")
        print(json.dumps(context_data['learnings']['performance_patterns'][0], indent=2))
    
    if context_data['learnings']['error_patterns']:
        print("\nExample error pattern:")
        print(json.dumps(context_data['learnings']['error_patterns'][0], indent=2))
    
    # Save for context manager
    save_learnings_for_context(context_data)
    
    # Also save a human-readable report
    report_path = Path(__file__).parent.parent / "logs" / "tool_metrics_report.md"
    with open(report_path, 'w') as f:
        f.write("# Tool Metrics Analysis Report\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Performance Patterns\n\n")
        for p in context_data['learnings']['performance_patterns']:
            f.write(f"- **{p.get('pattern', p.get('tool'))}**: ")
            if 'description' in p:
                f.write(p['description'])
            elif 'metrics' in p:
                f.write(f"Avg: {p['metrics']['avg_ms']:.0f}ms, Max: {p['metrics']['max_ms']:.0f}ms")
            f.write("\n")
        
        f.write("\n## Error Patterns\n\n")
        for p in context_data['learnings']['error_patterns']:
            f.write(f"- **{p['pattern']}**: {p['occurrences']} occurrences ({p['percentage']:.1f}%)\n")
        
        f.write("\n## Common Tool Sequences\n\n")
        for p in context_data['learnings']['sequence_patterns']:
            f.write(f"- {p['pattern']} (used {p['count']} times)\n")
    
    print(f"\nHuman-readable report saved to: {report_path}")

# Global constant for slow threshold (matching post_tool_use.py)
SLOW_THRESHOLD = 5000

if __name__ == "__main__":
    main()