# Metrics Analysis Report

Generated: 2025-07-29 17:58:28
Total Learnings: 4

## High Impact Learnings

### WebFetch_consistently_slow
**Description**: WebFetch operations are consistently slow with 65.5% taking >5s
**Confidence**: 58.0%
**Recommendation**: Consider: 1) Caching WebFetch results, 2) Batching operations, 3) Using alternative approaches

## Performance Patterns (1)

- **WebFetch_consistently_slow**: WebFetch operations are consistently slow with 65.5% taking >5s
  - Confidence: 58.0%, Impact: high
  - Consider: 1) Caching WebFetch results, 2) Batching operations, 3) Using alternative approaches

## Error Patterns (3)

- **PERMISSION_DENIED_recovery**: Common recovery pattern for PERMISSION_DENIED errors
  - Confidence: 33.3%, Impact: medium
  - When encountering PERMISSION_DENIED, consider using: WebFetch → Read → Edit

- **VALIDATION_ERROR_recovery**: Common recovery pattern for VALIDATION_ERROR errors
  - Confidence: 25.0%, Impact: medium
  - When encountering VALIDATION_ERROR, consider using: Write → WebFetch → Read

- **TIMEOUT_recovery**: Common recovery pattern for TIMEOUT errors
  - Confidence: 14.3%, Impact: medium
  - When encountering TIMEOUT, consider using: Write → Write → WebFetch

## Key Metrics

- High confidence patterns (>80%): 0
- Medium confidence patterns (50-80%): 1
- Low confidence patterns (<50%): 3