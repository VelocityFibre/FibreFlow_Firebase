#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Sub-Agent Stop Hook for FibreFlow
Tracks sub-agent completions and performance
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any


def extract_agent_info(data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract key information about the sub-agent execution"""
    return {
        "agent_name": data.get("agent_name", "unknown"),
        "task_description": data.get("task_description", "")[:200],  # First 200 chars
        "success": data.get("success", True),
        "error": data.get("error"),
        "execution_time_ms": data.get("execution_time_ms"),
    }


def main():
    """Main hook entry point"""
    # Read input from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        return
    
    timestamp = datetime.now().isoformat()
    
    # Create sub-agent log entry
    log_entry = {
        "timestamp": timestamp,
        "hook": "sub_agent_stop",
        "agent_info": extract_agent_info(input_data),
    }
    
    # Log to sub-agent specific file
    log_path = Path(__file__).parent.parent / "logs" / "sub_agent_executions.json"
    log_path.parent.mkdir(exist_ok=True)
    
    logs = []
    if log_path.exists():
        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(log_entry)
    
    # Keep only last 1000 executions
    if len(logs) > 1000:
        logs = logs[-1000:]
    
    with open(log_path, 'w') as f:
        json.dump(logs, f, indent=2)
    
    # Track agent performance metrics
    agent_name = log_entry["agent_info"]["agent_name"]
    metrics_path = Path(__file__).parent.parent / "logs" / "agent_metrics.json"
    
    metrics = {}
    if metrics_path.exists():
        try:
            with open(metrics_path, 'r') as f:
                metrics = json.load(f)
        except:
            metrics = {}
    
    if agent_name not in metrics:
        metrics[agent_name] = {
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "total_execution_time_ms": 0,
            "average_execution_time_ms": 0,
        }
    
    metrics[agent_name]["total_executions"] += 1
    
    if log_entry["agent_info"]["success"]:
        metrics[agent_name]["successful_executions"] += 1
    else:
        metrics[agent_name]["failed_executions"] += 1
    
    if log_entry["agent_info"]["execution_time_ms"]:
        metrics[agent_name]["total_execution_time_ms"] += log_entry["agent_info"]["execution_time_ms"]
        metrics[agent_name]["average_execution_time_ms"] = (
            metrics[agent_name]["total_execution_time_ms"] / 
            metrics[agent_name]["total_executions"]
        )
    
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)


if __name__ == "__main__":
    main()