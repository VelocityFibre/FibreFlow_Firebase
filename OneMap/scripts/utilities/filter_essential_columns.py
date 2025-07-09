#!/usr/bin/env python3
"""
Filter CSV to essential columns only
Reduces token count significantly for analysis
"""

import csv
import os

# Essential columns for duplicate analysis
ESSENTIAL_COLUMNS = [
    'Pole Number',
    'Property ID',
    'Status',
    'Location Address',
    'Flow Name Groups',
    'Sections',
    'PONs',
    'Drop Number',
    'Latitude',
    'Longitude',
    'Survey Date',
    'Field Agent Name (pole permission)',
    'Last Modified Pole Permissions By',
    'Last Modified Pole Permissions Date',
    'Last Modified Home Sign Ups By',
    'Last Modified Home Sign Ups Date',
    'Stand Number'  # Added for duplicate detection
]

def filter_csv(input_file, output_file, columns=None):
    """Filter CSV to only include specified columns"""
    if columns is None:
        columns = ESSENTIAL_COLUMNS
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        # Check which requested columns exist
        available_columns = []
        missing_columns = []
        for col in columns:
            if col in reader.fieldnames:
                available_columns.append(col)
            else:
                missing_columns.append(col)
        
        print(f"Original columns: {len(reader.fieldnames)}")
        print(f"Keeping columns: {len(available_columns)}")
        print(f"Reduction: {100 - (len(available_columns)/len(reader.fieldnames)*100):.1f}%")
        
        if missing_columns:
            print(f"\nWarning - columns not found: {missing_columns}")
        
        # Write filtered data
        with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=available_columns)
            writer.writeheader()
            
            row_count = 0
            for row in reader:
                filtered_row = {col: row.get(col, '') for col in available_columns}
                writer.writerow(filtered_row)
                row_count += 1
    
    print(f"\nFiltered {row_count} rows")
    
    # Compare file sizes
    original_size = os.path.getsize(input_file)
    filtered_size = os.path.getsize(output_file)
    reduction = 100 - (filtered_size/original_size*100)
    
    print(f"\nFile size reduction:")
    print(f"Original: {original_size/1024/1024:.2f} MB")
    print(f"Filtered: {filtered_size/1024/1024:.2f} MB")
    print(f"Reduction: {reduction:.1f}%")
    
    # Estimate token reduction
    # Rough estimate: file size reduction ≈ token reduction
    original_tokens = 11_800_000  # Known from Gemini
    estimated_tokens = int(original_tokens * (filtered_size/original_size))
    
    print(f"\nEstimated token count:")
    print(f"Original: {original_tokens:,} tokens")
    print(f"Filtered: {estimated_tokens:,} tokens")
    print(f"Can now fit in: {estimated_tokens/200_000:.1f} Claude contexts")

def analyze_columns(csv_file):
    """Analyze which columns have the most data"""
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Initialize counters
        column_stats = {col: {'non_empty': 0, 'total_chars': 0} for col in reader.fieldnames}
        total_rows = 0
        
        for row in reader:
            total_rows += 1
            for col, value in row.items():
                if value.strip():
                    column_stats[col]['non_empty'] += 1
                    column_stats[col]['total_chars'] += len(value)
        
        # Calculate fill rates
        for col in column_stats:
            stats = column_stats[col]
            stats['fill_rate'] = (stats['non_empty'] / total_rows * 100) if total_rows > 0 else 0
            stats['avg_length'] = stats['total_chars'] / stats['non_empty'] if stats['non_empty'] > 0 else 0
        
        # Sort by fill rate
        sorted_cols = sorted(column_stats.items(), key=lambda x: x[1]['fill_rate'], reverse=True)
        
        print(f"\nColumn Analysis (Total: {len(reader.fieldnames)} columns, {total_rows} rows)")
        print("\nTop 20 columns by fill rate:")
        print(f"{'Column':<50} {'Fill %':>8} {'Avg Len':>8} {'Total KB':>10}")
        print("-" * 80)
        
        for col, stats in sorted_cols[:20]:
            total_kb = stats['total_chars'] / 1024
            print(f"{col[:50]:<50} {stats['fill_rate']:>7.1f}% {stats['avg_length']:>7.1f} {total_kb:>9.1f}K")
        
        print(f"\nColumns with <10% data (candidates for removal):")
        empty_cols = [col for col, stats in sorted_cols if stats['fill_rate'] < 10]
        print(f"Found {len(empty_cols)} mostly empty columns")

def main():
    # Analyze columns first
    print("=== ANALYZING COLUMN USAGE ===")
    analyze_columns('Lawley_Project_Louis.csv')
    
    # Filter to essential columns
    print("\n=== FILTERING TO ESSENTIAL COLUMNS ===")
    filter_csv('Lawley_Project_Louis.csv', 'Lawley_Essential.csv')
    
    # Now split the filtered file
    print("\n=== SPLITTING FILTERED FILE ===")
    os.system('python3 split_large_csv.py Lawley_Essential.csv rows 1000')

if __name__ == "__main__":
    main()