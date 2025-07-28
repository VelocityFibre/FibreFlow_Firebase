#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "rich>=13.7.0",
# ]
# ///

"""
Stop Hook for FibreFlow
Logs conversation completion and saves chat history
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any
import hashlib


def extract_conversation_summary(messages: list) -> Dict[str, Any]:
    """Extract key information from conversation"""
    summary = {
        "total_messages": len(messages),
        "user_messages": 0,
        "assistant_messages": 0,
        "tools_used": set(),
        "files_modified": set(),
        "errors_encountered": 0,
        "data_integrity_checks": 0,
    }
    
    for msg in messages:
        role = msg.get("role", "")
        content = str(msg.get("content", ""))
        
        if role == "user":
            summary["user_messages"] += 1
        elif role == "assistant":
            summary["assistant_messages"] += 1
            
            # Extract tool uses
            if "tool_use" in content:
                tool_matches = re.findall(r'tool_use.*?name="([^"]+)"', content)
                summary["tools_used"].update(tool_matches)
            
            # Extract file paths
            if "file_path" in content:
                file_matches = re.findall(r'file_path["\s:]+([^"\s]+)', content)
                summary["files_modified"].update(file_matches)
            
            # Count errors
            if "error" in content.lower():
                summary["errors_encountered"] += 1
            
            # Count data integrity operations
            if any(term in content.lower() for term in ["pole", "drop", "integrity", "validation"]):
                summary["data_integrity_checks"] += 1
    
    # Convert sets to lists for JSON serialization
    summary["tools_used"] = list(summary["tools_used"])
    summary["files_modified"] = list(summary["files_modified"])
    
    return summary


def generate_session_id(data: Dict[str, Any]) -> str:
    """Generate unique session ID"""
    content = f"{data.get('timestamp', '')}_{len(data.get('messages', []))}"
    return hashlib.md5(content.encode()).hexdigest()[:12]


def main():
    """Main hook entry point"""
    import re  # Import here after dependencies are installed
    
    # Read input from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        return
    
    timestamp = datetime.now().isoformat()
    messages = input_data.get("messages", [])
    
    # Create session log entry
    session_log = {
        "timestamp": timestamp,
        "session_id": generate_session_id(input_data),
        "hook": "stop",
        "summary": extract_conversation_summary(messages),
        "duration_estimate": input_data.get("duration_ms"),
    }
    
    # Save session summary
    summary_path = Path(__file__).parent.parent / "logs" / "session_summaries.json"
    summary_path.parent.mkdir(exist_ok=True)
    
    summaries = []
    if summary_path.exists():
        try:
            with open(summary_path, 'r') as f:
                summaries = json.load(f)
        except:
            summaries = []
    
    summaries.append(session_log)
    
    # Keep only last 100 summaries
    if len(summaries) > 100:
        summaries = summaries[-100:]
    
    with open(summary_path, 'w') as f:
        json.dump(summaries, f, indent=2)
    
    # Save full chat log if it contains important operations
    if (session_log["summary"]["data_integrity_checks"] > 0 or 
        session_log["summary"]["errors_encountered"] > 0 or
        len(session_log["summary"]["files_modified"]) > 5):
        
        chat_path = Path(__file__).parent.parent / "logs" / "important_chats" / f"chat_{session_log['session_id']}.json"
        chat_path.parent.mkdir(exist_ok=True)
        
        with open(chat_path, 'w') as f:
            json.dump({
                "session_info": session_log,
                "messages": messages
            }, f, indent=2)
    
    # Log daily statistics
    today = datetime.now().date().isoformat()
    stats_path = Path(__file__).parent.parent / "logs" / f"daily_stats_{today}.json"
    
    daily_stats = {"sessions": 0, "total_messages": 0, "tools_used": {}, "files_modified": set()}
    if stats_path.exists():
        try:
            with open(stats_path, 'r') as f:
                daily_stats = json.load(f)
                # Convert lists back to sets for processing
                daily_stats["files_modified"] = set(daily_stats.get("files_modified", []))
        except:
            pass
    
    daily_stats["sessions"] += 1
    daily_stats["total_messages"] += session_log["summary"]["total_messages"]
    
    for tool in session_log["summary"]["tools_used"]:
        daily_stats["tools_used"][tool] = daily_stats["tools_used"].get(tool, 0) + 1
    
    daily_stats["files_modified"].update(session_log["summary"]["files_modified"])
    daily_stats["files_modified"] = list(daily_stats["files_modified"])  # Convert back to list
    
    with open(stats_path, 'w') as f:
        json.dump(daily_stats, f, indent=2)


if __name__ == "__main__":
    main()