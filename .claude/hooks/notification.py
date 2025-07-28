#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Notification Hook for FibreFlow
Handles when Claude Code needs user input
"""

import sys
import json
from pathlib import Path
from datetime import datetime


def main():
    """Main hook entry point"""
    # Read input from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        return
    
    notification_type = input_data.get("type", "")
    message = input_data.get("message", "")
    
    # Log notification
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "hook": "notification",
        "type": notification_type,
        "message": message,
    }
    
    # Check if it's a permission request for sensitive operations
    if "permission" in notification_type.lower():
        log_entry["security_relevant"] = True
        
        # Log to security events
        security_path = Path(__file__).parent.parent / "logs" / "security_events.json"
        security_path.parent.mkdir(exist_ok=True)
        
        security_logs = []
        if security_path.exists():
            try:
                with open(security_path, 'r') as f:
                    security_logs = json.load(f)
            except:
                security_logs = []
        
        security_logs.append(log_entry)
        
        with open(security_path, 'w') as f:
            json.dump(security_logs, f, indent=2)
    
    # Log all notifications
    log_path = Path(__file__).parent.parent / "logs" / "notifications.json"
    
    logs = []
    if log_path.exists():
        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(log_entry)
    
    # Keep only last 500 notifications
    if len(logs) > 500:
        logs = logs[-500:]
    
    with open(log_path, 'w') as f:
        json.dump(logs, f, indent=2)


if __name__ == "__main__":
    main()