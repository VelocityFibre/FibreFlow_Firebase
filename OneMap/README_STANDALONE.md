# OneMap - Agent Payment Verification System

## Overview
GPS-based duplicate detection system for agent pole permission payments in high-density informal settlements where addresses are unreliable.

## Quick Start

### 1. Analyze Payment Conflicts
```bash
# Extract first permissions only (baseline)
python3 extract_first_permissions_complete.py

# Generate agent conflict reports
python3 create_complete_agent_report.py

# Validate results (antiHall verification)
python3 validate_payment_analysis.py
```

### 2. Key Reports Generated

- `reports/YYYY-MM-DD_complete_agent_followup.csv` - All agents per pole
- `reports/YYYY-MM-DD_agent_followup_expanded.csv` - Side-by-side view
- `reports/YYYY-MM-DD_first_pole_permissions_complete.csv` - Baseline data
- `reports/VALIDATION_SUMMARY.md` - Data integrity verification

## Key Findings

- **3,749** total poles with permissions
- **998** poles (26.6%) have payment conflicts
- **873** HIGH RISK poles (multiple agents)
- **125** MEDIUM RISK poles (same agent multiple times)

## Business Context

Agents collect pole permissions door-to-door and are paid per pole. Multiple agents may claim the same pole, leading to duplicate payment requests. This system identifies conflicts using GPS coordinates (reliable) rather than addresses (unreliable in informal settlements).

## Data Requirements

Input CSV must have:
- `Pole Number` - Unique pole identifier
- `Latitude` / `Longitude` - GPS coordinates
- `Field Agent Name (pole permission)` - Agent claiming payment
- `Contact Number (e.g.0123456789)` - Agent contact
- `Flow Name Groups` - Must contain "Pole Permission"

## Validation Approach

All analysis follows antiHall principles:
1. Every claim backed by source data
2. No assumptions or extrapolations
3. GPS-based verification (addresses ignored)
4. Complete audit trail maintained

## File Structure

```
OneMap/
├── README.md                           # This file
├── CLAUDE.md                          # Development context
├── PAYMENT_VERIFICATION_CONTEXT.md    # Business requirements
├── Lawley_Project_Louis.csv          # Source data
├── extract_first_permissions_complete.py
├── create_complete_agent_report.py
├── validate_payment_analysis.py
└── reports/
    ├── *_complete_agent_followup.csv
    ├── *_first_pole_permissions_complete.csv
    └── VALIDATION_SUMMARY.md
```

## Contact

For questions about the analysis methodology or results, refer to PAYMENT_VERIFICATION_CONTEXT.md