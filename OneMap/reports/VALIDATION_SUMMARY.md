# antiHall Validation Summary

Generated: 2025-07-10 14:02:11

## Validation Results

All claims in the payment analysis reports have been verified against source data:

### Gps Calculation
- **test_points**: (-26.382490198, 27.794995192) to (-26.3824975907512, 27.7950021901272)
- **calculated_distance**: 1.08 meters
- **formula**: Haversine
- **Status**: ✓ VERIFIED

### Duplicate Counts
- **total_poles_analyzed**: 998
- **poles_with_multiple_agents**: 873
- **poles_with_single_agent**: 125
- **total_claims_processed**: 2451
- **Status**: ✓ VERIFIED

### Agent Statistics
- **total_agents_with_conflicts**: 81
- **top_5_agents**: {'itumeleng': 172, 'Yolanda': 106, 'simphiwe mashaba': 98, 'Zanele hele': 86, 'Disemelo': 86}
- **Status**: ✓ VERIFIED

### Data Completeness
- **original_unique_poles**: 3749
- **processed_poles**: 3749
- **data_loss**: 0
- **Status**: ✓ VERIFIED

### Risk Assessment
- **high_risk_poles**: 873
- **medium_risk_poles**: 21
- **risk_criteria**: {'HIGH': 'Multiple different agents', 'MEDIUM': 'Same agent multiple times', 'LOW': 'System duplicates (same day)'}
- **Status**: ✓ VERIFIED

### Contact Information
- **agents_with_contacts**: 81
- **agents_without_contacts**: 0
- **contact_coverage**: 100.0%
- **Status**: ✓ VERIFIED

## Key Evidence

Sample conflicts verified:
- **LAW.P.B341**: Dikgahlo Lesitha, Elizabeth, Vinolia, itumeleng, lebohang
- **LAW.P.B362**: itumeleng, Elizabeth, Karma, Lerato
- **LAW.P.B544**: Yolanda, Nonkululeko, Karma, Sylvia

## Conclusion

All analysis results are backed by verifiable data. No hallucinations detected.
The reports can be used confidently for payment verification decisions.
