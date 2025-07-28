#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "python-json-logger>=2.0.7",
#   "rich>=13.7.0",
# ]
# ///

"""
Post-Tool Use Hook for FibreFlow
Logs all tool executions for observability and audit trail
Captures performance metrics, validation failures, error patterns, and success rates
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
import hashlib
from collections import defaultdict, deque

# Tool categories for better organization
TOOL_CATEGORIES = {
    "filesystem": ["Read", "Write", "Edit", "MultiEdit", "LS", "Glob"],
    "execution": ["Bash", "Task"],
    "search": ["Grep", "WebSearch", "WebFetch"],
    "git": ["GitCommand"],
    "mcp": ["mcp__serena__", "ListMcpResourcesTool", "ReadMcpResourceTool"],
    "planning": ["exit_plan_mode", "TodoRead", "TodoWrite"],
    "memory": ["mcp__serena__write_memory", "mcp__serena__read_memory"],
    "validation": ["mcp__serena__think_about_collected_information", "mcp__serena__think_about_task_adherence"],
}

# Performance thresholds
SLOW_OPERATION_THRESHOLD_MS = 5000  # 5 seconds
VERY_SLOW_OPERATION_THRESHOLD_MS = 10000  # 10 seconds

# Error pattern tracking
ERROR_PATTERN_WINDOW = 100  # Last N operations to check for patterns
MIN_PATTERN_OCCURRENCES = 3  # Minimum occurrences to consider a pattern


def categorize_tool(tool_name: str) -> str:
    """Categorize tool for better log organization"""
    for category, tools in TOOL_CATEGORIES.items():
        if any(tool in tool_name for tool in tools):
            return category
    return "other"


def extract_key_info(tool_name: str, tool_input: Dict[str, Any], result: Any) -> Dict[str, Any]:
    """Extract key information based on tool type"""
    key_info = {}
    
    if tool_name in ["Write", "Edit", "MultiEdit"]:
        key_info["file_path"] = tool_input.get("file_path", "")
        # Check for pole/drop related content
        content = tool_input.get("content", "") or tool_input.get("new_string", "")
        if "pole" in content.lower() or "drop" in content.lower():
            key_info["data_type"] = "pole_drop_data"
            
    elif tool_name == "Read":
        key_info["file_path"] = tool_input.get("file_path", "")
        
    elif tool_name == "Bash":
        key_info["command"] = tool_input.get("command", "")
        
    elif tool_name == "Task":
        key_info["description"] = tool_input.get("description", "")
        key_info["prompt"] = tool_input.get("prompt", "")[:100] + "..."  # First 100 chars
        
    elif "mcp__serena__" in tool_name:
        key_info["mcp_action"] = tool_name.replace("mcp__serena__", "")
        
    return key_info


def extract_error_signature(error: str) -> str:
    """Extract a normalized error signature for pattern detection"""
    if not error:
        return ""
    
    # Common error patterns to normalize
    error_patterns = {
        r"File .* does not exist": "FILE_NOT_FOUND",
        r"Permission denied": "PERMISSION_DENIED",
        r"No such file or directory": "PATH_NOT_FOUND",
        r"Command .* not found": "COMMAND_NOT_FOUND",
        r"Timeout": "TIMEOUT",
        r"Connection refused": "CONNECTION_REFUSED",
        r"Invalid argument": "INVALID_ARGUMENT",
        r"Memory error": "MEMORY_ERROR",
        r"Syntax error": "SYNTAX_ERROR",
        r"Type error": "TYPE_ERROR",
    }
    
    import re
    for pattern, signature in error_patterns.items():
        if re.search(pattern, error, re.IGNORECASE):
            return signature
    
    # Return first 50 chars of error as signature if no pattern matches
    return error[:50].replace("\n", " ").strip()


def detect_validation_failure(tool_name: str, result: Any, error: Optional[str]) -> Optional[Dict[str, Any]]:
    """Detect validation failures from tool results"""
    validation_info = None
    
    # Check for explicit validation tools
    if "validate" in tool_name.lower() or "check" in tool_name.lower():
        if error or (isinstance(result, dict) and result.get("valid") is False):
            validation_info = {
                "type": "explicit_validation",
                "tool": tool_name,
                "failed": True,
                "reason": error or result.get("reason", "Unknown")
            }
    
    # Check for implicit validation failures
    if error:
        error_lower = error.lower()
        validation_keywords = ["invalid", "validation", "constraint", "requirement", "must", "should not", "cannot"]
        if any(keyword in error_lower for keyword in validation_keywords):
            validation_info = {
                "type": "implicit_validation",
                "tool": tool_name,
                "failed": True,
                "reason": error
            }
    
    return validation_info


def generate_event_id(data: Dict[str, Any]) -> str:
    """Generate unique event ID for deduplication"""
    content = f"{data['timestamp']}_{data['tool_name']}_{json.dumps(data['tool_input'])}"
    return hashlib.md5(content.encode()).hexdigest()[:12]


def analyze_performance_metrics(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze performance metrics from recent logs"""
    metrics = {
        "slow_operations": [],
        "very_slow_operations": [],
        "average_execution_times": defaultdict(list),
        "performance_trends": {}
    }
    
    for log in logs[-1000:]:  # Analyze last 1000 operations
        if "execution_time_ms" in log:
            exec_time = log["execution_time_ms"]
            tool_name = log["tool_name"]
            
            # Track average times by tool
            metrics["average_execution_times"][tool_name].append(exec_time)
            
            # Track slow operations
            if exec_time > VERY_SLOW_OPERATION_THRESHOLD_MS:
                metrics["very_slow_operations"].append({
                    "tool": tool_name,
                    "time_ms": exec_time,
                    "timestamp": log["timestamp"],
                    "details": log.get("key_info", {})
                })
            elif exec_time > SLOW_OPERATION_THRESHOLD_MS:
                metrics["slow_operations"].append({
                    "tool": tool_name,
                    "time_ms": exec_time,
                    "timestamp": log["timestamp"],
                    "details": log.get("key_info", {})
                })
    
    # Calculate averages
    for tool, times in metrics["average_execution_times"].items():
        if times:
            metrics["performance_trends"][tool] = {
                "avg_ms": sum(times) / len(times),
                "max_ms": max(times),
                "min_ms": min(times),
                "count": len(times)
            }
    
    return metrics


def analyze_error_patterns(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze error patterns from recent logs"""
    error_counts = defaultdict(int)
    error_sequences = []
    recent_errors = deque(maxlen=ERROR_PATTERN_WINDOW)
    
    for log in logs[-ERROR_PATTERN_WINDOW:]:
        if log.get("error"):
            error_sig = extract_error_signature(log["error"])
            error_counts[error_sig] += 1
            recent_errors.append({
                "signature": error_sig,
                "tool": log["tool_name"],
                "timestamp": log["timestamp"]
            })
    
    # Find repeated error patterns
    patterns = []
    for error_sig, count in error_counts.items():
        if count >= MIN_PATTERN_OCCURRENCES:
            patterns.append({
                "pattern": error_sig,
                "occurrences": count,
                "percentage": (count / len(recent_errors)) * 100 if recent_errors else 0
            })
    
    return {
        "error_patterns": patterns,
        "total_errors": len(recent_errors),
        "unique_errors": len(error_counts)
    }


def analyze_tool_sequences(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze common tool usage sequences"""
    sequences = defaultdict(int)
    sequence_window = 5
    
    for i in range(len(logs) - sequence_window):
        # Create sequence of tool names
        seq = tuple(logs[i+j]["tool_name"] for j in range(sequence_window))
        sequences[seq] += 1
    
    # Find most common sequences
    common_sequences = []
    for seq, count in sorted(sequences.items(), key=lambda x: x[1], reverse=True)[:10]:
        if count >= 3:  # At least 3 occurrences
            common_sequences.append({
                "sequence": list(seq),
                "count": count,
                "pattern": " → ".join(seq)
            })
    
    return {"common_sequences": common_sequences}


def calculate_success_rates(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate success/failure rates by tool and category"""
    tool_stats = defaultdict(lambda: {"success": 0, "failure": 0})
    category_stats = defaultdict(lambda: {"success": 0, "failure": 0})
    
    for log in logs:
        tool = log["tool_name"]
        category = log["tool_category"]
        
        if log["success"]:
            tool_stats[tool]["success"] += 1
            category_stats[category]["success"] += 1
        else:
            tool_stats[tool]["failure"] += 1
            category_stats[category]["failure"] += 1
    
    # Calculate rates
    success_rates = {
        "by_tool": {},
        "by_category": {},
        "overall": {"success": 0, "failure": 0}
    }
    
    for tool, stats in tool_stats.items():
        total = stats["success"] + stats["failure"]
        if total > 0:
            success_rates["by_tool"][tool] = {
                "success_rate": (stats["success"] / total) * 100,
                "total_operations": total,
                "failures": stats["failure"]
            }
    
    for category, stats in category_stats.items():
        total = stats["success"] + stats["failure"]
        if total > 0:
            success_rates["by_category"][category] = {
                "success_rate": (stats["success"] / total) * 100,
                "total_operations": total,
                "failures": stats["failure"]
            }
    
    # Overall rate
    total_success = sum(stats["success"] for stats in tool_stats.values())
    total_failure = sum(stats["failure"] for stats in tool_stats.values())
    total_ops = total_success + total_failure
    
    if total_ops > 0:
        success_rates["overall"] = {
            "success_rate": (total_success / total_ops) * 100,
            "total_operations": total_ops,
            "failures": total_failure
        }
    
    return success_rates


def save_analytics(analytics: Dict[str, Any]):
    """Save analytics to a separate file for monitoring"""
    analytics_path = Path(__file__).parent.parent / "logs" / "tool_analytics.json"
    analytics_path.parent.mkdir(exist_ok=True)
    
    # Load existing analytics
    existing = {}
    if analytics_path.exists():
        try:
            with open(analytics_path, 'r') as f:
                existing = json.load(f)
        except:
            existing = {}
    
    # Update with new analytics
    existing[datetime.now().isoformat()] = analytics
    
    # Keep only last 100 analytics snapshots
    if len(existing) > 100:
        # Sort by timestamp and keep latest 100
        sorted_items = sorted(existing.items())[-100:]
        existing = dict(sorted_items)
    
    with open(analytics_path, 'w') as f:
        json.dump(existing, f, indent=2)


def main():
    """Main hook entry point"""
    # Read input from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        # Silently fail - we don't want to interrupt the tool execution
        return
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    result = input_data.get("result", {})
    error = input_data.get("error")
    
    # Create log entry
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_id": generate_event_id(input_data),
        "hook": "post_tool_use",
        "tool_name": tool_name,
        "tool_category": categorize_tool(tool_name),
        "key_info": extract_key_info(tool_name, tool_input, result),
        "success": error is None,
        "error": error,
    }
    
    # Add execution time if available
    if "execution_time" in input_data:
        log_entry["execution_time_ms"] = input_data["execution_time"]
        
        # Flag slow operations
        if input_data["execution_time"] > SLOW_OPERATION_THRESHOLD_MS:
            log_entry["performance_flag"] = "slow" if input_data["execution_time"] < VERY_SLOW_OPERATION_THRESHOLD_MS else "very_slow"
    
    # Detect validation failures
    validation_failure = detect_validation_failure(tool_name, result, error)
    if validation_failure:
        log_entry["validation_failure"] = validation_failure
    
    # Add error signature for pattern detection
    if error:
        log_entry["error_signature"] = extract_error_signature(error)
    
    # Log to category-specific file
    category = log_entry["tool_category"]
    log_path = Path(__file__).parent.parent / "logs" / f"post_tool_use_{category}.json"
    log_path.parent.mkdir(exist_ok=True)
    
    logs = []
    if log_path.exists():
        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(log_entry)
    
    # Keep only last 5000 entries per category
    if len(logs) > 5000:
        logs = logs[-5000:]
    
    with open(log_path, 'w') as f:
        json.dump(logs, f, indent=2)
    
    # Also append to main log for complete audit trail
    main_log_path = Path(__file__).parent.parent / "logs" / "post_tool_use.json"
    main_logs = []
    if main_log_path.exists():
        try:
            with open(main_log_path, 'r') as f:
                main_logs = json.load(f)
        except:
            main_logs = []
    
    main_logs.append(log_entry)
    if len(main_logs) > 10000:
        main_logs = main_logs[-10000:]
    
    with open(main_log_path, 'w') as f:
        json.dump(main_logs, f, indent=2)
    
    # Special handling for data integrity operations
    if "data_type" in log_entry["key_info"] and log_entry["key_info"]["data_type"] == "pole_drop_data":
        integrity_log_path = Path(__file__).parent.parent / "logs" / "data_integrity_operations.json"
        integrity_logs = []
        if integrity_log_path.exists():
            try:
                with open(integrity_log_path, 'r') as f:
                    integrity_logs = json.load(f)
            except:
                integrity_logs = []
        
        integrity_logs.append({
            **log_entry,
            "operation_type": "pole_drop_modification"
        })
        
        with open(integrity_log_path, 'w') as f:
            json.dump(integrity_logs, f, indent=2)
    
    # Perform analytics every 100 operations
    if len(main_logs) % 100 == 0:
        analytics = {
            "timestamp": datetime.now().isoformat(),
            "performance": analyze_performance_metrics(main_logs),
            "errors": analyze_error_patterns(main_logs),
            "sequences": analyze_tool_sequences(main_logs[-500:]),  # Last 500 for sequences
            "success_rates": calculate_success_rates(main_logs),
            "total_operations": len(main_logs)
        }
        save_analytics(analytics)


if __name__ == "__main__":
    main()