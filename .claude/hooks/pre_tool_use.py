#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "jsonschema>=4.20.0",
#   "pydantic>=2.5.0",
# ]
# ///

"""
Pre-Tool Use Hook for FibreFlow
Validates data integrity rules before allowing tool execution
"""

import sys
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.fibreflow_validators import (
    validate_pole_number, validate_drop_number, validate_import_data,
    extract_entities_from_content, check_uniqueness, ValidationResult
)

# Dangerous commands to block
DANGEROUS_COMMANDS = [
    r'rm\s+-rf',
    r'rm\s+-fr',
    r':\(\)\{\s*:\|\s*:&\s*\};\s*:',  # Fork bomb
    r'mv\s+/\s+',
    r'chmod\s+777\s+/',
]

# Sensitive files to protect
PROTECTED_FILES = [
    '.env',
    '.env.local',
    'service-account.json',
    'firebase-admin-key.json',
]


def is_dangerous_command(command: str) -> bool:
    """Check if command matches dangerous patterns"""
    for pattern in DANGEROUS_COMMANDS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False


def is_protected_file(file_path: str) -> bool:
    """Check if file is in protected list"""
    path = Path(file_path)
    return path.name in PROTECTED_FILES or any(
        protected in str(path) for protected in PROTECTED_FILES
    )


def check_firestore_write(tool_input: Dict[str, Any]) -> Optional[str]:
    """
    Check Firestore write operations for data integrity
    Returns error message if validation fails, None if valid
    """
    # Check for pole/drop related writes
    if 'file_path' in tool_input:
        content = tool_input.get('content', '') or tool_input.get('new_string', '')
        
        # Extract entities from content
        entities = extract_entities_from_content(str(content))
        
        # Validate all pole numbers
        for pole in entities['pole_numbers']:
            result = validate_pole_number(pole)
            if not result.valid:
                return f"Pole validation failed: {'; '.join(result.errors)}"
            
            # Check uniqueness (commented out for now as it needs Firestore access)
            # unique, msg = check_uniqueness('poles', pole)
            # if not unique:
            #     return msg
        
        # Validate all drop numbers
        for drop in entities['drop_numbers']:
            result = validate_drop_number(drop)
            if not result.valid:
                return f"Drop validation failed: {'; '.join(result.errors)}"
        
        # Check for import data structure
        try:
            # Try to parse as JSON to check for structured data
            if content and (content.strip().startswith('{') or content.strip().startswith('[')):
                data = json.loads(content)
                if isinstance(data, dict) and any(key in data for key in ['poleNumber', 'dropNumber', 'gpsLocation']):
                    result = validate_import_data(data)
                    if not result.valid:
                        return f"Import validation failed: {'; '.join(result.errors)}"
        except json.JSONDecodeError:
            # Not JSON, that's fine
            pass
    
    return None


def main():
    """Main hook entry point"""
    # Read input from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({
            "error": f"Failed to parse input: {e}",
            "allow": False
        }))
        return
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    # Log the tool use attempt
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "hook": "pre_tool_use",
        "tool_name": tool_name,
        "tool_input": tool_input,
        "action": "checking"
    }
    
    # Check for dangerous bash commands
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if is_dangerous_command(command):
            result = {
                "error": f"🚫 Dangerous command blocked: {command}",
                "allow": False
            }
            log_entry["action"] = "blocked"
            log_entry["reason"] = "dangerous_command"
        else:
            result = {"allow": True}
            log_entry["action"] = "allowed"
    
    # Check for protected file access
    elif tool_name in ["Read", "Write", "Edit", "MultiEdit"]:
        file_path = tool_input.get("file_path", "")
        if is_protected_file(file_path):
            result = {
                "error": f"🔒 Access to protected file denied: {file_path}",
                "allow": False
            }
            log_entry["action"] = "blocked"
            log_entry["reason"] = "protected_file"
        else:
            # Additional validation for write operations
            if tool_name in ["Write", "Edit", "MultiEdit"]:
                error = check_firestore_write(tool_input)
                if error:
                    result = {
                        "error": f"❌ Data integrity validation failed: {error}",
                        "allow": False
                    }
                    log_entry["action"] = "blocked"
                    log_entry["reason"] = "data_integrity"
                else:
                    result = {"allow": True}
                    log_entry["action"] = "allowed"
            else:
                result = {"allow": True}
                log_entry["action"] = "allowed"
    
    else:
        # Allow all other tools
        result = {"allow": True}
        log_entry["action"] = "allowed"
    
    # Append to log file
    log_path = Path(__file__).parent.parent / "logs" / "pre_tool_use.json"
    log_path.parent.mkdir(exist_ok=True)
    
    logs = []
    if log_path.exists():
        try:
            with open(log_path, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(log_entry)
    
    # Keep only last 1000 entries
    if len(logs) > 1000:
        logs = logs[-1000:]
    
    with open(log_path, 'w') as f:
        json.dump(logs, f, indent=2)
    
    # Output result
    print(json.dumps(result))


if __name__ == "__main__":
    main()