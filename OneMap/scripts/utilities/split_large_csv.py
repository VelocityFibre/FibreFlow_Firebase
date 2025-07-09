#!/usr/bin/env python3
"""
Standard CSV Splitter for Large Files
Splits large CSV files into manageable chunks while preserving data integrity
"""

import csv
import os
import json
from datetime import datetime
from pathlib import Path

class CSVSplitter:
    def __init__(self, input_file, output_dir='split_data', chunk_size=1000):
        self.input_file = input_file
        self.output_dir = Path(output_dir)
        self.chunk_size = chunk_size
        self.metadata = {
            'original_file': input_file,
            'split_date': datetime.now().isoformat(),
            'chunks': []
        }
        
    def split_by_rows(self):
        """Split CSV into chunks of N rows each"""
        print(f"Splitting {self.input_file} by rows ({self.chunk_size} rows per file)...")
        
        # Create output directory
        self.output_dir.mkdir(exist_ok=True)
        
        with open(self.input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            headers = reader.fieldnames
            
            chunk_num = 0
            current_chunk = []
            total_rows = 0
            
            for row in reader:
                current_chunk.append(row)
                total_rows += 1
                
                if len(current_chunk) >= self.chunk_size:
                    self._write_chunk(headers, current_chunk, chunk_num, 'rows')
                    chunk_num += 1
                    current_chunk = []
            
            # Write remaining rows
            if current_chunk:
                self._write_chunk(headers, current_chunk, chunk_num, 'rows')
                
        self.metadata['total_rows'] = total_rows
        self.metadata['total_chunks'] = chunk_num + 1
        self._save_metadata()
        
        print(f"✓ Split complete: {total_rows} rows → {chunk_num + 1} files")
        
    def split_by_field(self, field_name):
        """Split CSV by unique values in a specific field"""
        print(f"Splitting {self.input_file} by field '{field_name}'...")
        
        # Create output directory
        self.output_dir.mkdir(exist_ok=True)
        
        # First pass: collect unique values
        field_values = {}
        with open(self.input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            headers = reader.fieldnames
            
            if field_name not in headers:
                raise ValueError(f"Field '{field_name}' not found in CSV")
                
            for row in reader:
                value = row.get(field_name, 'UNKNOWN').strip() or 'EMPTY'
                # Sanitize for filename
                safe_value = "".join(c for c in value if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
                
                if safe_value not in field_values:
                    field_values[safe_value] = []
                field_values[safe_value].append(row)
        
        # Write chunks
        for idx, (value, rows) in enumerate(field_values.items()):
            filename = f"chunk_{idx:04d}_{value}.csv"
            self._write_chunk(headers, rows, idx, f'field_{field_name}', filename)
            
        self.metadata['split_field'] = field_name
        self.metadata['unique_values'] = len(field_values)
        self._save_metadata()
        
        print(f"✓ Split complete: {len(field_values)} unique values in '{field_name}'")
        
    def split_by_date(self, date_field):
        """Split CSV by date ranges (monthly)"""
        print(f"Splitting {self.input_file} by date field '{date_field}'...")
        
        # Create output directory
        self.output_dir.mkdir(exist_ok=True)
        
        # Group by year-month
        date_groups = {}
        with open(self.input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            headers = reader.fieldnames
            
            for row in reader:
                date_str = row.get(date_field, '').strip()
                if not date_str:
                    month_key = 'NO_DATE'
                else:
                    try:
                        # Handle various date formats
                        if 'T' in date_str:
                            date_str = date_str.split('T')[0]
                        date_obj = datetime.fromisoformat(date_str)
                        month_key = date_obj.strftime('%Y_%m')
                    except:
                        month_key = 'INVALID_DATE'
                        
                if month_key not in date_groups:
                    date_groups[month_key] = []
                date_groups[month_key].append(row)
        
        # Write chunks
        for idx, (month, rows) in enumerate(sorted(date_groups.items())):
            filename = f"chunk_{idx:04d}_{month}.csv"
            self._write_chunk(headers, rows, idx, f'date_{date_field}', filename)
            
        self._save_metadata()
        print(f"✓ Split complete: {len(date_groups)} date groups")
        
    def split_smart(self):
        """Smart split based on data analysis"""
        print("Analyzing data for smart split...")
        
        # Analyze the data structure
        with open(self.input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            headers = reader.fieldnames
            
            # Sample first 100 rows
            sample = []
            for i, row in enumerate(reader):
                if i >= 100:
                    break
                sample.append(row)
                
        # Determine best split strategy
        recommendations = []
        
        # Check for address field
        if 'Location Address' in headers:
            unique_addrs = len(set(r.get('Location Address', '') for r in sample))
            recommendations.append({
                'method': 'split_by_field',
                'field': 'Location Address',
                'reason': f'{unique_addrs} unique addresses in sample'
            })
            
        # Check for status field
        if 'Status' in headers:
            unique_status = len(set(r.get('Status', '') for r in sample))
            if unique_status < 20:  # Reasonable number of statuses
                recommendations.append({
                    'method': 'split_by_field',
                    'field': 'Status',
                    'reason': f'{unique_status} unique statuses'
                })
                
        # Check for date fields
        date_fields = [h for h in headers if 'date' in h.lower()]
        if date_fields:
            recommendations.append({
                'method': 'split_by_date',
                'field': date_fields[0],
                'reason': f'Date field available: {date_fields[0]}'
            })
            
        # Default to row-based split
        recommendations.append({
            'method': 'split_by_rows',
            'chunk_size': 2000,
            'reason': 'Default strategy for manageable file sizes'
        })
        
        print("\n=== SPLIT RECOMMENDATIONS ===")
        for i, rec in enumerate(recommendations):
            print(f"{i+1}. {rec['method']}: {rec['reason']}")
            
        return recommendations
        
    def _write_chunk(self, headers, rows, chunk_num, split_type, filename=None):
        """Write a chunk to CSV file"""
        if filename is None:
            filename = f"chunk_{chunk_num:04d}.csv"
            
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', newline='', encoding='utf-8') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
            
        self.metadata['chunks'].append({
            'filename': filename,
            'rows': len(rows),
            'split_type': split_type,
            'chunk_num': chunk_num
        })
        
        print(f"  Written: {filename} ({len(rows)} rows)")
        
    def _save_metadata(self):
        """Save split metadata"""
        metadata_file = self.output_dir / 'split_metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
            
        print(f"\n✓ Metadata saved to: {metadata_file}")

def create_split_strategy():
    """Create standard splitting strategy document"""
    strategy = """# CSV Splitting Strategy for Large Files

## Standard Approach

### 1. File Size Thresholds
- **Small**: < 1MB (< ~10K rows) - No split needed
- **Medium**: 1-10MB (~10K-100K rows) - Optional split
- **Large**: 10-50MB (~100K-500K rows) - Recommended split
- **Extra Large**: > 50MB (> 500K rows) - Required split

### 2. Split Methods

#### A. By Row Count (Default)
- Use when: No logical grouping available
- Chunk size: 2,000-5,000 rows per file
- Preserves: Random distribution

#### B. By Field Value
- Use when: Logical grouping exists (e.g., Status, Location)
- Benefits: Related records stay together
- Good for: Address, Status, Agent, PON

#### C. By Date Range
- Use when: Time-series data
- Default: Monthly chunks
- Benefits: Easy to process chronologically

#### D. Smart Split
- Analyzes data structure
- Recommends best approach
- Considers field cardinality

### 3. Usage Examples

```python
# Basic row split
splitter = CSVSplitter('large_file.csv', chunk_size=2000)
splitter.split_by_rows()

# Split by status
splitter = CSVSplitter('large_file.csv', output_dir='by_status')
splitter.split_by_field('Status')

# Split by date
splitter = CSVSplitter('large_file.csv', output_dir='by_month')
splitter.split_by_date('Survey Date')

# Let the tool decide
splitter = CSVSplitter('large_file.csv')
recommendations = splitter.split_smart()
```

### 4. Benefits
- Manageable file sizes for analysis
- Parallel processing capability
- Reduced memory usage
- Easier debugging
- Version control friendly

### 5. Metadata Tracking
Each split generates `split_metadata.json`:
- Original filename
- Split method used
- Chunk information
- Row counts
- Timestamp
"""
    
    with open('CSV_SPLITTING_STRATEGY.md', 'w') as f:
        f.write(strategy)
    
    print("✓ Strategy document created: CSV_SPLITTING_STRATEGY.md")

def main():
    """Example usage"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python split_large_csv.py <csv_file> [method] [parameter]")
        print("\nExamples:")
        print("  python split_large_csv.py data.csv rows 2000")
        print("  python split_large_csv.py data.csv field Status")
        print("  python split_large_csv.py data.csv date 'Survey Date'")
        print("  python split_large_csv.py data.csv smart")
        create_split_strategy()
        return
        
    csv_file = sys.argv[1]
    method = sys.argv[2] if len(sys.argv) > 2 else 'smart'
    
    splitter = CSVSplitter(csv_file)
    
    if method == 'rows':
        chunk_size = int(sys.argv[3]) if len(sys.argv) > 3 else 2000
        splitter.chunk_size = chunk_size
        splitter.split_by_rows()
    elif method == 'field':
        field_name = sys.argv[3] if len(sys.argv) > 3 else 'Status'
        splitter.split_by_field(field_name)
    elif method == 'date':
        date_field = sys.argv[3] if len(sys.argv) > 3 else 'Survey Date'
        splitter.split_by_date(date_field)
    elif method == 'smart':
        recommendations = splitter.split_smart()
        # Use first recommendation
        if recommendations:
            rec = recommendations[0]
            if rec['method'] == 'split_by_rows':
                splitter.chunk_size = rec.get('chunk_size', 2000)
                splitter.split_by_rows()
            elif rec['method'] == 'split_by_field':
                splitter.split_by_field(rec['field'])
            elif rec['method'] == 'split_by_date':
                splitter.split_by_date(rec['field'])

if __name__ == "__main__":
    main()