#!/usr/bin/env python3
"""
Master script to run all payment verification reports
Generates all reports needed to prevent duplicate agent payments
"""

import subprocess
import os
from datetime import datetime

def run_payment_verification():
    """Run all payment verification scripts and generate reports"""
    
    print("=== VELOCITY FIBRE - PAYMENT VERIFICATION SYSTEM ===")
    print(f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)
    
    # Change to OneMap directory
    os.chdir('/home/ldp/VF/Apps/FibreFlow/OneMap')
    
    # Ensure reports directory exists
    os.makedirs('reports', exist_ok=True)
    
    print("\n1. Running GPS-based duplicate analysis...")
    print("-" * 50)
    try:
        subprocess.run(['python3', 'scripts/payment_verification/analyze_gps_duplicates.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running GPS analysis: {e}")
        return False
    
    print("\n2. Creating agent follow-up reports...")
    print("-" * 50)
    try:
        subprocess.run(['python3', 'scripts/payment_verification/create_agent_followup_report.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error creating follow-up reports: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ ALL REPORTS GENERATED SUCCESSFULLY!")
    print("=" * 50)
    
    # List generated reports
    report_date = datetime.now().strftime('%Y-%m-%d')
    print(f"\n📁 Reports saved in: reports/")
    print("\n🔍 FOR PAYMENT PROCESSING:")
    print(f"   - {report_date}_payment_conflicts_detailed.csv")
    print(f"   - {report_date}_high_risk_payment_summary.json")
    
    print("\n📞 FOR AGENT FOLLOW-UP:")
    print(f"   - {report_date}_agent_followup_list.csv (with phone numbers)")
    print(f"   - {report_date}_agent_contact_list.csv")
    
    print("\n📊 FOR ACCOUNTABILITY:")
    print(f"   - {report_date}_agent_conflict_summary.csv")
    
    print("\n💡 NEXT STEPS:")
    print("   1. Review high_risk_payment_summary.json for overview")
    print("   2. Use agent_followup_list.csv to call agents")
    print("   3. Hold payments for poles in payment_conflicts_detailed.csv")
    print("   4. Update payment records after verification")
    
    return True

if __name__ == "__main__":
    success = run_payment_verification()
    exit(0 if success else 1)