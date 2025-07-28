#!/usr/bin/env python3
"""
Process Auto-Captured Metrics to Learnings
==========================================

This script analyzes the objective data collected by the post_tool_use hook
and generates actionable learnings for the context manager.

It runs deeper analysis than the basic analyze_tool_metrics.py script,
focusing on extracting patterns that can improve Claude's future performance.
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
from collections import defaultdict, Counter
import re
from dataclasses import dataclass
from statistics import mean, median, stdev

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from context_manager import ContextManager
except ImportError:
    print("Warning: Could not import ContextManager. Learnings will only be saved to file.")
    ContextManager = None


@dataclass
class Learning:
    """Represents a learning extracted from metrics"""
    type: str  # performance, error, sequence, validation, success_rate
    pattern: str
    description: str
    confidence: float  # 0.0 to 1.0
    impact: str  # high, medium, low
    recommendation: str
    metrics: Dict[str, Any]
    examples: List[str]
    timestamp: str = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "pattern": self.pattern,
            "description": self.description,
            "confidence": self.confidence,
            "impact": self.impact,
            "recommendation": self.recommendation,
            "metrics": self.metrics,
            "examples": self.examples[:3],  # Limit examples
            "timestamp": self.timestamp,
            "measurable": True
        }


class MetricsAnalyzer:
    """Analyzes metrics and extracts learnings"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.logs_path = self.base_path / "logs"
        self.learnings = []
        
    def load_all_data(self) -> Tuple[List[Dict], Dict[str, Any]]:
        """Load logs and analytics data"""
        # Load main logs
        logs = []
        log_file = self.logs_path / "post_tool_use.json"
        if log_file.exists():
            with open(log_file, 'r') as f:
                logs = json.load(f)
        
        # Load analytics
        analytics = {}
        analytics_file = self.logs_path / "tool_analytics.json"
        if analytics_file.exists():
            with open(analytics_file, 'r') as f:
                analytics = json.load(f)
        
        return logs, analytics
    
    def analyze_performance_bottlenecks(self, logs: List[Dict]) -> List[Learning]:
        """Identify performance bottlenecks and patterns"""
        learnings = []
        
        # Group by tool and calculate statistics
        tool_times = defaultdict(list)
        for log in logs:
            if log.get("time_ms"):
                tool_times[log["tool"]].append(log["time_ms"])
        
        for tool, times in tool_times.items():
            if len(times) < 5:  # Need enough data
                continue
                
            avg_time = mean(times)
            med_time = median(times)
            
            # Check for consistent slowness
            if avg_time > 3000:  # 3 seconds average
                slow_percentage = sum(1 for t in times if t > 5000) / len(times) * 100
                
                learning = Learning(
                    type="performance",
                    pattern=f"{tool}_consistently_slow",
                    description=f"{tool} operations are consistently slow with {slow_percentage:.1f}% taking >5s",
                    confidence=min(0.95, len(times) / 50),  # More data = higher confidence
                    impact="high" if avg_time > 5000 else "medium",
                    recommendation=f"Consider: 1) Caching {tool} results, 2) Batching operations, 3) Using alternative approaches",
                    metrics={
                        "avg_ms": avg_time,
                        "median_ms": med_time,
                        "slow_percentage": slow_percentage,
                        "sample_size": len(times)
                    },
                    examples=[f"{tool} took {t}ms" for t in sorted(times, reverse=True)[:3]]
                )
                learnings.append(learning)
            
            # Check for high variance (unpredictable performance)
            if len(times) > 10:
                std_dev = stdev(times)
                cv = std_dev / avg_time if avg_time > 0 else 0  # Coefficient of variation
                
                if cv > 1.0:  # High variance
                    learning = Learning(
                        type="performance",
                        pattern=f"{tool}_high_variance",
                        description=f"{tool} has highly variable performance (CV={cv:.2f})",
                        confidence=0.8,
                        impact="medium",
                        recommendation="Investigate what causes performance variance - could be data size, network, or system load",
                        metrics={
                            "coefficient_of_variation": cv,
                            "std_dev_ms": std_dev,
                            "range_ms": max(times) - min(times)
                        },
                        examples=[f"Range: {min(times)}ms to {max(times)}ms"]
                    )
                    learnings.append(learning)
        
        return learnings
    
    def analyze_error_recovery_patterns(self, logs: List[Dict]) -> List[Learning]:
        """Analyze how errors are recovered from"""
        learnings = []
        
        # Find error sequences and what follows
        error_recovery = defaultdict(list)
        
        for i in range(len(logs) - 1):
            if not logs[i]["success"] and logs[i].get("error"):
                # Look at next 5 operations
                recovery_sequence = []
                for j in range(i + 1, min(i + 6, len(logs))):
                    recovery_sequence.append({
                        "tool": logs[j]["tool"],
                        "success": logs[j]["success"]
                    })
                
                error_type = self._extract_error_type(logs[i]["error"])
                error_recovery[error_type].append(recovery_sequence)
        
        # Analyze recovery patterns
        for error_type, recoveries in error_recovery.items():
            if len(recoveries) < 3:  # Need enough examples
                continue
            
            # Find common recovery patterns
            recovery_patterns = Counter()
            for recovery in recoveries:
                pattern = " → ".join([r["tool"] for r in recovery[:3]])
                if pattern:
                    recovery_patterns[pattern] += 1
            
            if recovery_patterns:
                most_common = recovery_patterns.most_common(1)[0]
                
                learning = Learning(
                    type="error",
                    pattern=f"{error_type}_recovery",
                    description=f"Common recovery pattern for {error_type} errors",
                    confidence=min(0.9, most_common[1] / len(recoveries)),
                    impact="medium",
                    recommendation=f"When encountering {error_type}, consider using: {most_common[0]}",
                    metrics={
                        "total_occurrences": len(recoveries),
                        "pattern_frequency": most_common[1],
                        "recovery_patterns": dict(recovery_patterns.most_common(3))
                    },
                    examples=[most_common[0]]
                )
                learnings.append(learning)
        
        return learnings
    
    def analyze_tool_sequences(self, logs: List[Dict]) -> List[Learning]:
        """Analyze tool usage sequences for workflow optimization"""
        learnings = []
        
        # Extract sequences of length 3-7
        sequences = defaultdict(list)
        for seq_len in range(3, 8):
            for i in range(len(logs) - seq_len + 1):
                seq = tuple(logs[i+j]["tool"] for j in range(seq_len))
                sequences[seq_len].append(seq)
        
        # Find most common sequences
        for seq_len, seqs in sequences.items():
            if not seqs:
                continue
                
            seq_counter = Counter(seqs)
            common_seqs = seq_counter.most_common(5)
            
            for seq, count in common_seqs:
                if count < 5:  # Minimum threshold
                    continue
                
                # Calculate success rate for this sequence
                success_count = 0
                for i in range(len(logs) - seq_len + 1):
                    if tuple(logs[i+j]["tool"] for j in range(seq_len)) == seq:
                        if all(logs[i+j]["success"] for j in range(seq_len)):
                            success_count += 1
                
                success_rate = success_count / count if count > 0 else 0
                
                if count >= 10 and success_rate > 0.8:  # Successful pattern
                    learning = Learning(
                        type="sequence",
                        pattern=f"workflow_{seq_len}_tools",
                        description=f"Common {seq_len}-tool workflow with {success_rate*100:.1f}% success rate",
                        confidence=min(0.95, count / 50),
                        impact="high" if count > 20 else "medium",
                        recommendation=f"This workflow is proven effective. Consider creating a macro or composite action.",
                        metrics={
                            "sequence": " → ".join(seq),
                            "frequency": count,
                            "success_rate": success_rate,
                            "length": seq_len
                        },
                        examples=[" → ".join(seq)]
                    )
                    learnings.append(learning)
        
        return learnings
    
    def analyze_validation_patterns(self, logs: List[Dict]) -> List[Learning]:
        """Analyze validation failures and their causes"""
        learnings = []
        
        # Group validation failures by type and reason
        validation_failures = defaultdict(lambda: defaultdict(list))
        
        for log in logs:
            if log.get("validation_failure"):
                vf = log["validation_failure"]
                validation_failures[vf["type"]][vf["reason"]].append({
                    "tool": vf["tool"],
                    "timestamp": log["timestamp"]
                })
        
        # Analyze patterns
        for val_type, reasons in validation_failures.items():
            for reason, occurrences in reasons.items():
                if len(occurrences) < 3:  # Need enough examples
                    continue
                
                # Find which tools commonly fail
                tool_failures = Counter(o["tool"] for o in occurrences)
                
                learning = Learning(
                    type="validation",
                    pattern=f"{val_type}_validation_failure",
                    description=f"Repeated {val_type} validation failures: {reason[:100]}",
                    confidence=min(0.9, len(occurrences) / 10),
                    impact="high",  # Validation failures are always high impact
                    recommendation=f"Add pre-validation checks before using {tool_failures.most_common(1)[0][0]}",
                    metrics={
                        "failure_count": len(occurrences),
                        "affected_tools": dict(tool_failures),
                        "validation_type": val_type
                    },
                    examples=[reason[:200]]
                )
                learnings.append(learning)
        
        return learnings
    
    def analyze_success_patterns(self, logs: List[Dict]) -> List[Learning]:
        """Analyze what leads to successful operations"""
        learnings = []
        
        # Group by tool and analyze success factors
        tool_contexts = defaultdict(lambda: {"success": [], "failure": []})
        
        for i, log in enumerate(logs):
            if i > 0:  # Look at previous context
                context = {
                    "prev_tool": logs[i-1]["tool"],
                    "prev_success": logs[i-1]["success"],
                    "category": log.get("category", "other")
                }
                
                if log["success"]:
                    tool_contexts[log["tool"]]["success"].append(context)
                else:
                    tool_contexts[log["tool"]]["failure"].append(context)
        
        # Find patterns in successful operations
        for tool, contexts in tool_contexts.items():
            if len(contexts["success"]) < 10:  # Need enough data
                continue
            
            success_rate = len(contexts["success"]) / (len(contexts["success"]) + len(contexts["failure"]))
            
            # Find what commonly precedes success
            success_predecessors = Counter(c["prev_tool"] for c in contexts["success"])
            failure_predecessors = Counter(c["prev_tool"] for c in contexts["failure"])
            
            # Find tools that lead to higher success rates
            for predecessor, count in success_predecessors.most_common(3):
                success_with_pred = count
                failure_with_pred = failure_predecessors.get(predecessor, 0)
                total_with_pred = success_with_pred + failure_with_pred
                
                if total_with_pred >= 5:  # Enough data
                    pred_success_rate = success_with_pred / total_with_pred
                    
                    if pred_success_rate > success_rate * 1.2:  # 20% better than average
                        learning = Learning(
                            type="success_rate",
                            pattern=f"{predecessor}_before_{tool}",
                            description=f"Using {predecessor} before {tool} increases success rate by {(pred_success_rate/success_rate - 1)*100:.1f}%",
                            confidence=min(0.9, total_with_pred / 20),
                            impact="medium",
                            recommendation=f"Consider using {predecessor} to prepare context before {tool} operations",
                            metrics={
                                "base_success_rate": success_rate,
                                "improved_success_rate": pred_success_rate,
                                "improvement_percentage": (pred_success_rate/success_rate - 1)*100,
                                "sample_size": total_with_pred
                            },
                            examples=[f"{predecessor} → {tool} (success)"]
                        )
                        learnings.append(learning)
        
        return learnings
    
    def _extract_error_type(self, error: str) -> str:
        """Extract normalized error type from error message"""
        error_patterns = {
            r"file.*not.*found|no such file": "FILE_NOT_FOUND",
            r"permission denied": "PERMISSION_DENIED",
            r"timeout|timed out": "TIMEOUT",
            r"connection.*refused|connection.*error": "CONNECTION_ERROR",
            r"syntax error": "SYNTAX_ERROR",
            r"type error|type mismatch": "TYPE_ERROR",
            r"validation.*fail|invalid": "VALIDATION_ERROR",
            r"not.*implement|unsupported": "NOT_IMPLEMENTED",
            r"memory|out of memory": "MEMORY_ERROR",
            r"authentication|unauthorized": "AUTH_ERROR"
        }
        
        error_lower = error.lower()
        for pattern, error_type in error_patterns.items():
            if re.search(pattern, error_lower):
                return error_type
        
        return "UNKNOWN_ERROR"
    
    def generate_summary_report(self, learnings: List[Learning]) -> str:
        """Generate a human-readable summary report"""
        report = ["# Metrics Analysis Report", ""]
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Total Learnings: {len(learnings)}")
        report.append("")
        
        # Group by type
        by_type = defaultdict(list)
        for learning in learnings:
            by_type[learning.type].append(learning)
        
        # High impact learnings
        high_impact = [l for l in learnings if l.impact == "high"]
        if high_impact:
            report.append("## High Impact Learnings")
            report.append("")
            for learning in sorted(high_impact, key=lambda l: l.confidence, reverse=True)[:5]:
                report.append(f"### {learning.pattern}")
                report.append(f"**Description**: {learning.description}")
                report.append(f"**Confidence**: {learning.confidence:.1%}")
                report.append(f"**Recommendation**: {learning.recommendation}")
                report.append("")
        
        # Summary by type
        for ltype, learnings_of_type in by_type.items():
            report.append(f"## {ltype.title()} Patterns ({len(learnings_of_type)})")
            report.append("")
            
            for learning in sorted(learnings_of_type, key=lambda l: l.confidence, reverse=True)[:3]:
                report.append(f"- **{learning.pattern}**: {learning.description}")
                report.append(f"  - Confidence: {learning.confidence:.1%}, Impact: {learning.impact}")
                report.append(f"  - {learning.recommendation}")
                report.append("")
        
        # Key metrics
        report.append("## Key Metrics")
        report.append("")
        report.append(f"- High confidence patterns (>80%): {len([l for l in learnings if l.confidence > 0.8])}")
        report.append(f"- Medium confidence patterns (50-80%): {len([l for l in learnings if 0.5 <= l.confidence <= 0.8])}")
        report.append(f"- Low confidence patterns (<50%): {len([l for l in learnings if l.confidence < 0.5])}")
        
        return "\n".join(report)
    
    def run_analysis(self):
        """Run the complete analysis"""
        print("Loading metrics data...")
        logs, analytics = self.load_all_data()
        
        if not logs:
            print("No log data found. Run some operations first.")
            return
        
        print(f"Analyzing {len(logs)} operations...")
        
        # Run all analyses
        self.learnings.extend(self.analyze_performance_bottlenecks(logs))
        self.learnings.extend(self.analyze_error_recovery_patterns(logs))
        self.learnings.extend(self.analyze_tool_sequences(logs))
        self.learnings.extend(self.analyze_validation_patterns(logs))
        self.learnings.extend(self.analyze_success_patterns(logs))
        
        print(f"Extracted {len(self.learnings)} learnings")
        
        # Save learnings
        self.save_learnings()
        
        # Generate report
        report = self.generate_summary_report(self.learnings)
        report_path = self.logs_path / "metrics_analysis_report.md"
        with open(report_path, 'w') as f:
            f.write(report)
        print(f"Report saved to: {report_path}")
        
        # Add to context manager if available
        if ContextManager:
            self.add_to_context_manager()
    
    def save_learnings(self):
        """Save learnings to file"""
        output_path = self.logs_path / "extracted_learnings.json"
        
        learnings_data = {
            "timestamp": datetime.now().isoformat(),
            "source": "metrics_processor",
            "learnings": [l.to_dict() for l in self.learnings],
            "summary": {
                "total": len(self.learnings),
                "by_type": Counter(l.type for l in self.learnings),
                "by_impact": Counter(l.impact for l in self.learnings),
                "high_confidence": len([l for l in self.learnings if l.confidence > 0.8])
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(learnings_data, f, indent=2)
        
        print(f"Learnings saved to: {output_path}")
    
    def add_to_context_manager(self):
        """Add learnings to context manager"""
        try:
            cm = ContextManager()
            
            # Add each high-confidence learning
            added = 0
            for learning in self.learnings:
                if learning.confidence > 0.7:  # Only add confident learnings
                    cm.add_learning(
                        category=f"metrics_{learning.type}",
                        pattern=learning.pattern,
                        solution=learning.recommendation,
                        confidence=learning.confidence,
                        metadata={
                            "impact": learning.impact,
                            "metrics": learning.metrics,
                            "description": learning.description,
                            "timestamp": learning.timestamp
                        }
                    )
                    added += 1
            
            print(f"Added {added} learnings to context manager")
            
        except Exception as e:
            print(f"Could not add to context manager: {e}")


def main():
    """Main entry point"""
    analyzer = MetricsAnalyzer()
    analyzer.run_analysis()


if __name__ == "__main__":
    main()