#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""
Simple notification system for FibreFlow hooks
Can be extended with email, Slack, or other integrations
"""

import json
import sys
from datetime import datetime
from pathlib import Path


class NotificationSystem:
    def __init__(self):
        self.log_path = Path(__file__).parent.parent / 'logs' / 'notifications_sent.json'
        self.log_path.parent.mkdir(exist_ok=True)
    
    def send_notification(self, notification_type: str, title: str, message: str, severity: str = 'info'):
        """Send a notification and log it"""
        notification = {
            'timestamp': datetime.now().isoformat(),
            'type': notification_type,
            'title': title,
            'message': message,
            'severity': severity
        }
        
        # For now, just print to console with formatting
        self._console_notify(notification)
        
        # Log the notification
        self._log_notification(notification)
        
        # Future: Add integrations here
        # self._send_email(notification)
        # self._send_slack(notification)
        # self._send_desktop(notification)
    
    def _console_notify(self, notification: dict):
        """Print notification to console with formatting"""
        severity_icons = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅'
        }
        
        icon = severity_icons.get(notification['severity'], '📢')
        
        print(f"\n{icon} {notification['title']}")
        print(f"   {notification['message']}")
        print(f"   [{notification['timestamp']}]\n")
    
    def _log_notification(self, notification: dict):
        """Log notification to file"""
        logs = []
        if self.log_path.exists():
            try:
                with open(self.log_path, 'r') as f:
                    logs = json.load(f)
            except:
                logs = []
        
        logs.append(notification)
        
        # Keep only last 1000 notifications
        if len(logs) > 1000:
            logs = logs[-1000:]
        
        with open(self.log_path, 'w') as f:
            json.dump(logs, f, indent=2)


class FibreFlowNotifier:
    """Specific notifications for FibreFlow events"""
    
    def __init__(self):
        self.notifier = NotificationSystem()
    
    def data_integrity_violation(self, details: str):
        """Notify about data integrity violations"""
        self.notifier.send_notification(
            'data_integrity',
            'Data Integrity Violation Blocked',
            details,
            'error'
        )
    
    def import_completed(self, batch_id: str, record_count: int, duration: float):
        """Notify about import completion"""
        self.notifier.send_notification(
            'import',
            'Import Completed Successfully',
            f'Batch {batch_id}: {record_count} records imported in {duration:.1f}s',
            'success'
        )
    
    def daily_report_ready(self, report_path: str):
        """Notify that daily report is ready"""
        self.notifier.send_notification(
            'report',
            'Daily Operations Report Ready',
            f'Report saved to: {report_path}',
            'info'
        )
    
    def security_alert(self, threat: str):
        """Notify about security issues"""
        self.notifier.send_notification(
            'security',
            'Security Alert',
            threat,
            'warning'
        )
    
    def agent_failure(self, agent_name: str, error: str):
        """Notify about agent failures"""
        self.notifier.send_notification(
            'agent',
            f'Agent Failure: {agent_name}',
            error,
            'error'
        )
    
    def threshold_exceeded(self, metric: str, value: float, threshold: float):
        """Notify when metrics exceed thresholds"""
        self.notifier.send_notification(
            'threshold',
            'Threshold Exceeded',
            f'{metric}: {value} (threshold: {threshold})',
            'warning'
        )


def main():
    """Test notifications or send from command line"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Send FibreFlow notifications")
    parser.add_argument('--type', required=True, 
                       choices=['integrity', 'import', 'report', 'security', 'agent', 'custom'])
    parser.add_argument('--title', help='Notification title')
    parser.add_argument('--message', help='Notification message')
    parser.add_argument('--severity', default='info',
                       choices=['info', 'warning', 'error', 'success'])
    
    args = parser.parse_args()
    
    notifier = FibreFlowNotifier()
    
    if args.type == 'custom':
        NotificationSystem().send_notification(
            'custom',
            args.title or 'Custom Notification',
            args.message or 'Custom message',
            args.severity
        )
    elif args.type == 'integrity':
        notifier.data_integrity_violation(args.message or 'Test violation')
    elif args.type == 'security':
        notifier.security_alert(args.message or 'Test security alert')
    # Add other notification types as needed


if __name__ == "__main__":
    main()