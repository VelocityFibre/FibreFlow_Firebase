# Metrics to Learning Processing System

## Overview

The `process_metrics_to_learnings.py` script performs deep analysis on the objective data collected by the `post_tool_use` hook, extracting actionable insights and patterns that can improve Claude's future performance.

## What It Analyzes

### 1. Performance Bottlenecks
- **Consistently Slow Tools**: Identifies tools that regularly exceed performance thresholds
- **High Variance Performance**: Detects tools with unpredictable execution times
- **Statistical Analysis**: Uses mean, median, and standard deviation for robust insights

### 2. Error Recovery Patterns
- **Error Types**: Normalizes errors into categories (FILE_NOT_FOUND, PERMISSION_DENIED, etc.)
- **Recovery Sequences**: Identifies what tools are commonly used to recover from specific errors
- **Success Patterns**: Tracks which recovery approaches work best

### 3. Tool Usage Sequences
- **Workflow Detection**: Finds 3-7 tool sequences that appear frequently
- **Success Rate Analysis**: Calculates success rates for common workflows
- **Optimization Opportunities**: Identifies workflows that could be converted to macros

### 4. Validation Patterns
- **Failure Analysis**: Groups validation failures by type and reason
- **Tool-Specific Issues**: Identifies which tools commonly fail validation
- **Prevention Strategies**: Suggests pre-validation checks

### 5. Success Patterns
- **Context Analysis**: Examines what precedes successful operations
- **Tool Pairing**: Identifies tool combinations that increase success rates
- **Improvement Metrics**: Quantifies the improvement from using certain patterns

## Running the Analysis

### Manual Execution
```bash
# Run the analysis directly
python3 .claude/scripts/process_metrics_to_learnings.py

# Or use the runner script
.claude/scripts/run_metrics_learning.sh
```

### Automated Execution (Cron)
Add to crontab for periodic analysis:
```bash
# Run every 6 hours
0 */6 * * * /path/to/FibreFlow/.claude/scripts/run_metrics_learning.sh

# Run daily at 2 AM
0 2 * * * /path/to/FibreFlow/.claude/scripts/run_metrics_learning.sh
```

## Output Files

### 1. `extracted_learnings.json`
Machine-readable learnings with:
- Learning type and pattern
- Confidence scores (0.0-1.0)
- Impact levels (high/medium/low)
- Actionable recommendations
- Supporting metrics

### 2. `metrics_analysis_report.md`
Human-readable report containing:
- High impact learnings summary
- Patterns grouped by type
- Key metrics and statistics
- Specific recommendations

### 3. `learning_runs.log`
Execution log tracking:
- When analysis was run
- Number of learnings extracted
- Any errors encountered

## Learning Structure

Each learning contains:
```json
{
  "type": "performance|error|sequence|validation|success_rate",
  "pattern": "unique_pattern_identifier",
  "description": "Human-readable description",
  "confidence": 0.85,  // 0.0 to 1.0
  "impact": "high|medium|low",
  "recommendation": "Actionable advice",
  "metrics": {
    // Pattern-specific measurements
  },
  "examples": ["concrete examples"],
  "timestamp": "2024-01-29T10:30:00",
  "measurable": true
}
```

## Integration with Context Manager

High-confidence learnings (>70%) are automatically added to the context manager for future use. The integration:
1. Categorizes learnings as `metrics_{type}`
2. Stores pattern and solution
3. Includes metadata for filtering
4. Enables pattern-based improvements

## Confidence Scoring

Confidence is calculated based on:
- **Sample Size**: More occurrences = higher confidence
- **Consistency**: Stable patterns score higher
- **Statistical Significance**: Patterns must exceed thresholds
- **Impact**: High-impact patterns get confidence boosts

## Impact Classification

- **High Impact**: Performance >5s, validation failures, <80% success rates
- **Medium Impact**: Performance 3-5s, recoverable errors, workflow optimizations
- **Low Impact**: Minor improvements, edge cases

## Example Learnings

### Performance Learning
```json
{
  "type": "performance",
  "pattern": "WebFetch_consistently_slow",
  "description": "WebFetch operations are consistently slow with 75.0% taking >5s",
  "confidence": 0.92,
  "impact": "high",
  "recommendation": "Consider: 1) Caching WebFetch results, 2) Batching operations, 3) Using alternative approaches",
  "metrics": {
    "avg_ms": 7234,
    "median_ms": 6800,
    "slow_percentage": 75.0,
    "sample_size": 48
  }
}
```

### Error Recovery Learning
```json
{
  "type": "error",
  "pattern": "FILE_NOT_FOUND_recovery",
  "description": "Common recovery pattern for FILE_NOT_FOUND errors",
  "confidence": 0.85,
  "impact": "medium",
  "recommendation": "When encountering FILE_NOT_FOUND, consider using: LS → Glob → Read",
  "metrics": {
    "total_occurrences": 12,
    "pattern_frequency": 8,
    "recovery_patterns": {
      "LS → Glob → Read": 8,
      "Glob → LS": 3
    }
  }
}
```

### Workflow Learning
```json
{
  "type": "sequence",
  "pattern": "workflow_5_tools",
  "description": "Common 5-tool workflow with 94.7% success rate",
  "confidence": 0.95,
  "impact": "high",
  "recommendation": "This workflow is proven effective. Consider creating a macro or composite action.",
  "metrics": {
    "sequence": "Read → Edit → Read → Edit → Write",
    "frequency": 38,
    "success_rate": 0.947,
    "length": 5
  }
}
```

## Best Practices

1. **Regular Analysis**: Run at least daily to capture patterns
2. **Review High Impact**: Focus on high impact, high confidence learnings
3. **Implement Recommendations**: Act on the suggested improvements
4. **Monitor Changes**: Track if implemented changes improve metrics
5. **Clean Old Data**: Periodically archive old metrics to maintain performance

## Troubleshooting

### No Learnings Generated
- Check if operations have been logged: `ls -la .claude/logs/post_tool_use.json`
- Ensure enough data exists (typically need >100 operations)
- Verify the hook is capturing data properly

### Low Confidence Scores
- Need more data for statistical significance
- Patterns may be too varied or inconsistent
- Consider adjusting thresholds in the script

### Integration Issues
- Ensure context_manager.py is in the parent directory
- Check Python path configuration
- Learnings are still saved to file even if integration fails