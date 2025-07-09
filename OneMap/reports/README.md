# OneMap Payment Verification Reports

This folder contains all generated reports for agent payment verification.

## Report Types

### 1. `YYYY-MM-DD_payment_conflicts_detailed.csv`
**Purpose**: Complete list of all pole permissions with potential conflicts  
**Use**: Line-by-line verification with agents  
**Contains**: 
- Every pole permission claim
- Agent names, dates, GPS coordinates
- Risk level (HIGH/MEDIUM/LOW)
- Action required

### 2. `YYYY-MM-DD_high_risk_payment_summary.json`
**Purpose**: Executive summary for management  
**Use**: Quick overview of payment risks  
**Contains**:
- Top high-risk poles (multiple agents)
- Summary statistics
- Recommendations

### 3. `YYYY-MM-DD_agent_conflict_summary.csv`
**Purpose**: Agent accountability tracking  
**Use**: Identify agents with most conflicts  
**Contains**:
- Agent names with conflict counts
- Sample pole numbers
- Action required (URGENT REVIEW if >3 conflicts)

### 4. `YYYY-MM-DD_gps_duplicate_analysis.json`
**Purpose**: Technical analysis metadata  
**Use**: Audit trail and technical reference  
**Contains**:
- Analysis timestamp
- Data quality metrics
- Processing details

## How to Use These Reports

1. **For Payment Processing**:
   - Open `payment_conflicts_detailed.csv`
   - Filter by "HIGH" risk level
   - Hold payments for these poles

2. **For Agent Follow-up**:
   - Open `agent_conflict_summary.csv`
   - Contact agents marked "URGENT REVIEW"
   - Verify their claims

3. **For Management Reporting**:
   - Use `high_risk_payment_summary.json`
   - Shows financial impact and recommendations

## Report Naming Convention
All reports are prefixed with the generation date (YYYY-MM-DD) for easy tracking and archival.