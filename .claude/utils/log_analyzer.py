#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "rich>=13.7.0",
#   "python-json-logger>=2.0.7",
# ]
# ///

"""
Log Analyzer for FibreFlow Claude Code Hooks
Provides insights from hook logs
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
from collections import defaultdict, Counter
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.text import Text

console = Console()


class LogAnalyzer:
    def __init__(self, logs_dir: Path):
        self.logs_dir = logs_dir
        self.logs = {
            'pre_tool_use': [],
            'post_tool_use': [],
            'notifications': [],
            'session_summaries': [],
            'sub_agent_executions': [],
            'agent_metrics': {},
            'daily_stats': {}
        }
    
    def load_logs(self, hours: int = 24):
        """Load logs from the last N hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Load different log types
        log_files = {
            'pre_tool_use': 'pre_tool_use.json',
            'post_tool_use': 'post_tool_use.json',
            'notifications': 'notifications.json',
            'session_summaries': 'session_summaries.json',
            'sub_agent_executions': 'sub_agent_executions.json',
        }
        
        for log_type, filename in log_files.items():
            log_path = self.logs_dir / filename
            if log_path.exists():
                try:
                    with open(log_path, 'r') as f:
                        logs = json.load(f)
                        # Filter by time if timestamp available
                        if isinstance(logs, list):
                            self.logs[log_type] = [
                                log for log in logs
                                if self._is_recent(log.get('timestamp'), cutoff_time)
                            ]
                except Exception as e:
                    console.print(f"[red]Error loading {filename}: {e}[/red]")
        
        # Load agent metrics
        metrics_path = self.logs_dir / 'agent_metrics.json'
        if metrics_path.exists():
            try:
                with open(metrics_path, 'r') as f:
                    self.logs['agent_metrics'] = json.load(f)
            except:
                pass
        
        # Load daily stats
        today = datetime.now().date().isoformat()
        stats_path = self.logs_dir / f'daily_stats_{today}.json'
        if stats_path.exists():
            try:
                with open(stats_path, 'r') as f:
                    self.logs['daily_stats'] = json.load(f)
            except:
                pass
    
    def _is_recent(self, timestamp_str: str, cutoff: datetime) -> bool:
        """Check if timestamp is recent"""
        if not timestamp_str:
            return True
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            return timestamp > cutoff
        except:
            return True
    
    def generate_dashboard(self):
        """Generate a comprehensive dashboard"""
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3)
        )
        
        # Header
        header_text = Text("FibreFlow Claude Code Analytics Dashboard", justify="center", style="bold blue")
        layout["header"].update(Panel(header_text))
        
        # Body - split into sections
        layout["body"].split_row(
            Layout(name="left"),
            Layout(name="right")
        )
        
        # Left side - Tool usage and errors
        layout["body"]["left"].split_column(
            Layout(name="tool_usage"),
            Layout(name="errors")
        )
        
        # Right side - Agent performance and data integrity
        layout["body"]["right"].split_column(
            Layout(name="agent_performance"),
            Layout(name="data_integrity")
        )
        
        # Populate sections
        layout["body"]["left"]["tool_usage"].update(self._create_tool_usage_panel())
        layout["body"]["left"]["errors"].update(self._create_errors_panel())
        layout["body"]["right"]["agent_performance"].update(self._create_agent_performance_panel())
        layout["body"]["right"]["data_integrity"].update(self._create_data_integrity_panel())
        
        # Footer
        footer_text = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        layout["footer"].update(Panel(footer_text, style="dim"))
        
        console.print(layout)
    
    def _create_tool_usage_panel(self) -> Panel:
        """Create tool usage statistics panel"""
        tool_counter = Counter()
        
        for log in self.logs['post_tool_use']:
            tool_name = log.get('tool_name', 'Unknown')
            tool_counter[tool_name] += 1
        
        table = Table(title="Tool Usage (24h)")
        table.add_column("Tool", style="cyan")
        table.add_column("Count", justify="right", style="green")
        
        for tool, count in tool_counter.most_common(10):
            table.add_row(tool, str(count))
        
        return Panel(table, title="Most Used Tools")
    
    def _create_errors_panel(self) -> Panel:
        """Create errors summary panel"""
        errors = []
        
        # Check pre-tool blocks
        for log in self.logs['pre_tool_use']:
            if log.get('action') == 'blocked':
                errors.append({
                    'type': 'Blocked Command',
                    'reason': log.get('reason', 'Unknown'),
                    'time': log.get('timestamp', '')
                })
        
        # Check post-tool errors
        for log in self.logs['post_tool_use']:
            if not log.get('success', True):
                errors.append({
                    'type': 'Tool Error',
                    'tool': log.get('tool_name', 'Unknown'),
                    'error': log.get('error', 'Unknown error')
                })
        
        if not errors:
            return Panel("[green]No errors in the last 24 hours![/green]", title="Errors & Blocks")
        
        table = Table()
        table.add_column("Type", style="red")
        table.add_column("Details")
        
        for error in errors[-5:]:  # Show last 5 errors
            table.add_row(error['type'], str(error.get('reason') or error.get('error')))
        
        return Panel(table, title=f"Recent Errors ({len(errors)} total)")
    
    def _create_agent_performance_panel(self) -> Panel:
        """Create agent performance panel"""
        metrics = self.logs.get('agent_metrics', {})
        
        if not metrics:
            return Panel("[yellow]No agent metrics available[/yellow]", title="Agent Performance")
        
        table = Table(title="Sub-Agent Performance")
        table.add_column("Agent", style="cyan")
        table.add_column("Runs", justify="right")
        table.add_column("Success", justify="right", style="green")
        table.add_column("Avg Time", justify="right")
        
        for agent, data in metrics.items():
            total = data.get('total_executions', 0)
            success = data.get('successful_executions', 0)
            avg_time = data.get('average_execution_time_ms', 0)
            
            success_rate = f"{(success/total*100):.0f}%" if total > 0 else "N/A"
            avg_time_str = f"{avg_time:.0f}ms" if avg_time > 0 else "N/A"
            
            table.add_row(agent, str(total), success_rate, avg_time_str)
        
        return Panel(table, title="Agent Performance Metrics")
    
    def _create_data_integrity_panel(self) -> Panel:
        """Create data integrity summary panel"""
        integrity_logs = [
            log for log in self.logs['post_tool_use']
            if 'data_type' in log.get('key_info', {})
        ]
        
        validations = {
            'poles_validated': 0,
            'drops_validated': 0,
            'integrity_failures': 0
        }
        
        for log in integrity_logs:
            key_info = log.get('key_info', {})
            if key_info.get('data_type') == 'pole_drop_data':
                if log.get('success'):
                    validations['poles_validated'] += 1
                else:
                    validations['integrity_failures'] += 1
        
        # Check for blocked validations
        for log in self.logs['pre_tool_use']:
            if log.get('reason') == 'data_integrity':
                validations['integrity_failures'] += 1
        
        text = f"""
[bold]Data Integrity Status[/bold]

Poles Validated: [green]{validations['poles_validated']}[/green]
Drops Validated: [green]{validations['drops_validated']}[/green]
Validation Failures: [red]{validations['integrity_failures']}[/red]

[dim]Enforcing pole uniqueness and drop capacity limits[/dim]
        """
        
        return Panel(text.strip(), title="Data Integrity")
    
    def generate_report(self, report_type: str = 'summary'):
        """Generate specific report types"""
        if report_type == 'summary':
            self.generate_dashboard()
        elif report_type == 'tools':
            self._generate_tools_report()
        elif report_type == 'agents':
            self._generate_agents_report()
        elif report_type == 'integrity':
            self._generate_integrity_report()
        else:
            console.print(f"[red]Unknown report type: {report_type}[/red]")
    
    def _generate_tools_report(self):
        """Detailed tools usage report"""
        console.print(Panel("Tool Usage Analysis", style="bold blue"))
        
        # Categorize tools
        tool_categories = defaultdict(list)
        for log in self.logs['post_tool_use']:
            category = log.get('tool_category', 'other')
            tool_categories[category].append(log)
        
        for category, logs in tool_categories.items():
            console.print(f"\n[bold]{category.upper()} Tools[/bold]")
            tool_count = Counter(log.get('tool_name') for log in logs)
            
            table = Table()
            table.add_column("Tool")
            table.add_column("Usage", justify="right")
            table.add_column("Success Rate", justify="right")
            
            for tool, count in tool_count.most_common():
                success = sum(1 for log in logs if log.get('tool_name') == tool and log.get('success', True))
                rate = f"{(success/count*100):.0f}%"
                table.add_row(tool, str(count), rate)
            
            console.print(table)
    
    def _generate_agents_report(self):
        """Detailed agent performance report"""
        console.print(Panel("Agent Performance Analysis", style="bold blue"))
        
        # Recent executions
        console.print("\n[bold]Recent Agent Executions[/bold]")
        table = Table()
        table.add_column("Time")
        table.add_column("Agent")
        table.add_column("Status")
        table.add_column("Duration")
        
        for log in self.logs['sub_agent_executions'][-10:]:
            agent_info = log.get('agent_info', {})
            timestamp = log.get('timestamp', '')[:19]  # Trim to seconds
            status = "[green]✓[/green]" if agent_info.get('success') else "[red]✗[/red]"
            duration = f"{agent_info.get('execution_time_ms', 0)}ms"
            
            table.add_row(timestamp, agent_info.get('agent_name', 'Unknown'), status, duration)
        
        console.print(table)
    
    def _generate_integrity_report(self):
        """Data integrity detailed report"""
        console.print(Panel("Data Integrity Report", style="bold blue"))
        
        # Find all validation events
        validations = []
        
        for log in self.logs['pre_tool_use']:
            if log.get('reason') in ['data_integrity', 'dangerous_command', 'protected_file']:
                validations.append({
                    'time': log.get('timestamp', ''),
                    'type': 'Blocked',
                    'reason': log.get('reason'),
                    'details': log.get('tool_input', {})
                })
        
        if not validations:
            console.print("[green]No integrity violations detected![/green]")
            return
        
        console.print(f"\n[bold]Found {len(validations)} validation events[/bold]")
        
        for val in validations[-10:]:
            console.print(f"\n[yellow]{val['time']}[/yellow]")
            console.print(f"Type: {val['type']}")
            console.print(f"Reason: {val['reason']}")
            if val['details']:
                console.print(f"Details: {json.dumps(val['details'], indent=2)}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze FibreFlow Claude Code logs")
    parser.add_argument('--hours', type=int, default=24, help='Hours to look back (default: 24)')
    parser.add_argument('--report', choices=['summary', 'tools', 'agents', 'integrity'], 
                       default='summary', help='Report type to generate')
    parser.add_argument('--logs-dir', type=Path, 
                       default=Path(__file__).parent.parent / 'logs',
                       help='Logs directory path')
    
    args = parser.parse_args()
    
    analyzer = LogAnalyzer(args.logs_dir)
    analyzer.load_logs(args.hours)
    analyzer.generate_report(args.report)


if __name__ == "__main__":
    main()