#!/usr/bin/env python3
"""
Process all PENDING Ettiene images by reading the GPS overlay text
"""

import csv
import os
import sys
from datetime import datetime

# Image directory
IMAGE_DIR = "OneMap/uploaded-images/ettiene"
CSV_FILE = "reports/ettiene-all-278-images.csv"
OUTPUT_FILE = f"reports/ettiene-complete-{datetime.now().strftime('%Y-%m-%d-%H%M')}.csv"

def process_images():
    """Process all PENDING images"""
    
    # Read existing CSV
    rows = []
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"📊 Total images in CSV: {len(rows)}")
    
    # Count statuses
    pending_count = sum(1 for row in rows if row['Status'] == 'PENDING')
    extracted_count = sum(1 for row in rows if row['Status'] == 'EXTRACTED')
    
    print(f"✅ Already extracted: {extracted_count}")
    print(f"⏳ Pending processing: {pending_count}")
    print(f"🚀 Starting to process {pending_count} PENDING images...\n")
    
    # Process each PENDING image
    processed = 0
    for i, row in enumerate(rows):
        if row['Status'] != 'PENDING':
            continue
            
        filename = row['File Name']
        filepath = os.path.join(IMAGE_DIR, filename)
        
        print(f"📸 Processing {processed + 1}/{pending_count}: {filename}")
        
        # Here we would normally read the image, but since I'll do it manually
        # I'll mark this for manual processing
        print(f"   ⏸️  Marked for manual reading: {filepath}")
        
        processed += 1
        
        # Stop after first batch to demonstrate
        if processed >= 10:
            print(f"\n🛑 Stopping after {processed} images for demonstration")
            break
    
    print(f"\n✅ Script ready. Will process {pending_count} images when run with image reading capability.")
    
    # Save the list of files to process
    with open('reports/ettiene-pending-files.txt', 'w') as f:
        for row in rows:
            if row['Status'] == 'PENDING':
                f.write(f"{row['File Name']}\n")
    
    print(f"📝 Saved list of {pending_count} PENDING files to: reports/ettiene-pending-files.txt")

if __name__ == "__main__":
    process_images()