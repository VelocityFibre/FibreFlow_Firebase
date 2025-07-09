# OneMap Scripts Documentation

Organized scripts for data analysis and payment verification.

## Directory Structure

### 📁 payment_verification/
**Purpose**: Scripts for preventing duplicate agent payments

- **run_payment_verification.py** - Master script that runs all payment reports
- **analyze_gps_duplicates.py** - GPS-based duplicate detection (main analysis)
- **create_agent_followup_report.py** - Creates reports with agent phone numbers

**To run all payment reports:**
```bash
python3 scripts/payment_verification/run_payment_verification.py
```

### 📁 data_analysis/
**Purpose**: General data analysis and exploration scripts

- analyze_duplicates.py - Original duplicate analysis
- reanalyze_with_workflow.py - Workflow-aware analysis
- analyze_pole_duplicates.py - Pole-specific analysis
- analyze_and_export_complete.py - Comprehensive analysis
- analyze_agent_payments.py - Initial payment analysis

### 📁 utilities/
**Purpose**: Helper scripts and tools

- validate_analysis.py - antiHall validation
- split_large_csv.py - Split large CSV files
- filter_essential_columns.py - Extract essential columns

## Quick Start

For payment verification (main use case):
```bash
cd /home/ldp/VF/Apps/FibreFlow/OneMap
python3 scripts/payment_verification/run_payment_verification.py
```

This will generate all reports in the `reports/` folder with today's date.

## Output Location
All reports are saved in: `/home/ldp/VF/Apps/FibreFlow/OneMap/reports/`