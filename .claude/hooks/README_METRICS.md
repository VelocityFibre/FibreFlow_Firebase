# Enhanced Tool Metrics Capture

## Overview

The `post_tool_use.py` hook has been enhanced to automatically capture objective, measurable metrics for improving Claude's performance and learning from patterns.

## What's Captured

### 1. Performance Metrics
- **Slow Operations**: Tools taking >5 seconds
- **Very Slow Operations**: Tools taking >10 seconds
- **Average Execution Times**: Per tool type
- **Performance Trends**: Min/max/avg times per tool

### 2. Validation Failures
- **Explicit Validations**: Tools with "validate" or "check" in name
- **Implicit Validations**: Errors containing validation keywords
- **Failure Reasons**: Captured for pattern analysis

### 3. Error Patterns
- **Error Signatures**: Normalized error types (FILE_NOT_FOUND, PERMISSION_DENIED, etc.)
- **Error Frequency**: How often each error occurs
- **Error Sequences**: Patterns in error occurrences

### 4. Tool Usage Sequences
- **Common Workflows**: 5-tool sequences that repeat
- **Sequence Frequency**: How often sequences occur
- **Pattern Detection**: Identifies common tool chains

### 5. Success/Failure Rates
- **By Tool**: Success rate for each tool
- **By Category**: Success rate for tool categories
- **Overall Rate**: System-wide success metrics

## Analytics Generation

Analytics are automatically generated every 100 operations and saved to:
- `.claude/logs/tool_analytics.json` - Raw analytics data
- `.claude/logs/tool_learnings.json` - Formatted for context manager

## Using the Analysis Script

Run the analysis script to extract learnings:

```bash
python .claude/scripts/analyze_tool_metrics.py
```

This generates:
- `tool_learnings.json` - Machine-readable patterns for context manager
- `tool_metrics_report.md` - Human-readable report

## Log Files

### Main Logs
- `post_tool_use.json` - All operations (max 10,000)
- `post_tool_use_{category}.json` - Category-specific (max 5,000)
- `data_integrity_operations.json` - Pole/drop modifications

### Analytics Logs
- `tool_analytics.json` - Performance and pattern analytics
- `tool_learnings.json` - Extracted learnings for context manager

## Thresholds

- **Slow Operation**: >5,000ms (5 seconds)
- **Very Slow Operation**: >10,000ms (10 seconds)
- **Pattern Detection**: Minimum 3 occurrences
- **Error Pattern Window**: Last 100 operations

## Integration with Context Manager

The captured metrics are designed to be consumed by the context manager for:
1. **Performance Optimization**: Identify tools that need optimization
2. **Error Prevention**: Learn from repeated errors
3. **Workflow Optimization**: Optimize common tool sequences
4. **Validation Improvement**: Prevent common validation failures

## Example Captured Data

### Performance Pattern
```json
{
  "type": "performance_pattern",
  "pattern": "WebFetch_slow_operation",
  "description": "WebFetch operations averaging 7500ms (>5000ms)",
  "occurrences": 8,
  "confidence": 0.9,
  "recommendation": "Consider optimizing WebFetch operations or adding progress indicators",
  "measurable": true,
  "metrics": {
    "avg_ms": 7500,
    "max_ms": 12000,
    "threshold_ms": 5000
  }
}
```

### Error Pattern
```json
{
  "type": "error_pattern",
  "pattern": "FILE_NOT_FOUND",
  "occurrences": 5,
  "percentage": 25.0,
  "confidence": 0.5,
  "measurable": true,
  "recommendation": "Implement specific handling for FILE_NOT_FOUND errors"
}
```

### Tool Sequence Pattern
```json
{
  "type": "tool_sequence_pattern",
  "sequence": ["Read", "Edit", "Read", "Edit", "Write"],
  "pattern": "Read → Edit → Read → Edit → Write",
  "count": 12,
  "confidence": 0.6,
  "measurable": true,
  "use_case": "Optimize for this common workflow"
}
```

## Privacy & Security

- No sensitive data is logged (passwords, keys, etc.)
- File contents are not stored, only metadata
- Logs are local and not sent anywhere
- Old logs are automatically pruned

## Maintenance

- Logs are automatically rotated (last N entries kept)
- Analytics snapshots are kept for last 100 runs
- Learnings are kept for last 50 analyses