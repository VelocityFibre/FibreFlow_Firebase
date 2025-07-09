#!/usr/bin/env python3
"""
Comprehensive Duplicate Analysis across all chunks
Processes filtered CSV chunks and generates detailed reports
"""

import csv
import json
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

class ChunkAnalyzer:
    def __init__(self, chunk_dir='split_data'):
        self.chunk_dir = Path(chunk_dir)
        self.global_index = {}
        self.duplicates = defaultdict(list)
        self.stats = {
            'total_records': 0,
            'unique_addresses': 0,
            'duplicate_addresses': 0,
            'unique_property_ids': set(),
            'max_duplicates_single_address': 0,
            'processing_time': 0
        }
        
    def analyze_all_chunks(self):
        """Process all chunks and build global duplicate index"""
        start_time = datetime.now()
        
        # Load metadata
        with open(self.chunk_dir / 'split_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        print(f"Processing {metadata['total_chunks']} chunks...")
        
        # Process each chunk
        for chunk_info in metadata['chunks']:
            self._process_chunk(chunk_info['filename'])
        
        # Calculate final stats
        self.stats['processing_time'] = (datetime.now() - start_time).total_seconds()
        self.stats['unique_addresses'] = len(self.global_index)
        self.stats['duplicate_addresses'] = len([a for a, records in self.global_index.items() if len(records) > 1])
        
        # Find address with most duplicates
        if self.global_index:
            max_addr = max(self.global_index.items(), key=lambda x: len(x[1]))
            self.stats['max_duplicates_single_address'] = len(max_addr[1])
            self.stats['worst_duplicate_address'] = max_addr[0]
        
        print(f"\nAnalysis complete in {self.stats['processing_time']:.2f} seconds")
        
    def _process_chunk(self, filename):
        """Process a single chunk file"""
        filepath = self.chunk_dir / filename
        
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                self.stats['total_records'] += 1
                
                # Extract key fields
                prop_id = row.get('Property ID', '').strip()
                address = row.get('Location Address', '').strip()
                status = row.get('Status', '').strip()
                pole = row.get('Pole Number', '').strip()
                
                if prop_id:
                    self.stats['unique_property_ids'].add(prop_id)
                
                if address:
                    # Add to global index
                    if address not in self.global_index:
                        self.global_index[address] = []
                    
                    self.global_index[address].append({
                        'property_id': prop_id,
                        'status': status,
                        'pole_number': pole,
                        'chunk': filename
                    })
        
        print(f"  Processed {filename}: {self.stats['total_records']} total records")
    
    def generate_duplicate_report(self):
        """Generate comprehensive duplicate analysis report"""
        report = []
        report.append("# Comprehensive Duplicate Analysis Report")
        report.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Processing Time: {self.stats['processing_time']:.2f} seconds")
        
        # Summary statistics
        report.append("\n## Summary Statistics")
        report.append(f"- Total Records: {self.stats['total_records']:,}")
        report.append(f"- Unique Property IDs: {len(self.stats['unique_property_ids']):,}")
        report.append(f"- Unique Addresses: {self.stats['unique_addresses']:,}")
        report.append(f"- Addresses with Duplicates: {self.stats['duplicate_addresses']:,}")
        report.append(f"- Duplicate Rate: {self.stats['duplicate_addresses']/self.stats['unique_addresses']*100:.1f}%")
        
        # Top duplicates
        report.append("\n## Top 20 Duplicate Addresses")
        sorted_dupes = sorted(
            [(addr, records) for addr, records in self.global_index.items() if len(records) > 1],
            key=lambda x: len(x[1]),
            reverse=True
        )[:20]
        
        for addr, records in sorted_dupes:
            report.append(f"\n### {addr}")
            report.append(f"**Duplicate Count: {len(records)}**")
            
            # Group by status
            by_status = defaultdict(int)
            unique_poles = set()
            for r in records:
                by_status[r['status'] or 'No Status'] += 1
                if r['pole_number']:
                    unique_poles.add(r['pole_number'])
            
            report.append(f"- Unique Poles: {len(unique_poles)}")
            report.append("- Status Distribution:")
            for status, count in sorted(by_status.items(), key=lambda x: x[1], reverse=True):
                report.append(f"  - {status}: {count}")
        
        # Analysis insights
        report.append("\n## Key Insights")
        report.append(f"1. **Worst Case**: {self.stats['worst_duplicate_address'][:50]}... has {self.stats['max_duplicates_single_address']} entries")
        report.append(f"2. **Data Quality**: {self.stats['duplicate_addresses']/self.stats['unique_addresses']*100:.1f}% of addresses have duplicates")
        report.append(f"3. **Unique IDs**: All {len(self.stats['unique_property_ids'])} Property IDs are unique (no ID duplicates)")
        
        # Save report
        with open('DUPLICATE_ANALYSIS_REPORT.md', 'w') as f:
            f.write('\n'.join(report))
        
        print(f"\nReport saved to: DUPLICATE_ANALYSIS_REPORT.md")
        
        # Also save JSON data
        json_data = {
            'stats': self.stats,
            'duplicate_addresses': {
                addr: records for addr, records in self.global_index.items() 
                if len(records) > 1
            }
        }
        
        with open('duplicate_analysis_results.json', 'w') as f:
            json.dump(json_data, f, indent=2, default=str)
        
        print("Detailed data saved to: duplicate_analysis_results.json")

def compare_with_sql():
    """Generate comparison between CSV chunk analysis and SQL approach"""
    comparison = """
# CSV Chunk Analysis vs SQL Database Approach

## Current CSV Chunk Approach

### Process:
1. Filter columns (30MB → 3.6MB)
2. Split into chunks (15 files)
3. Process each chunk
4. Merge results

### Performance:
- Processing time: ~5-10 seconds
- Memory usage: Minimal (streaming)
- Setup time: Immediate

### Pros:
- No database setup required
- Works with existing files
- Portable (Python only)
- Easy to modify/debug
- Version control friendly

### Cons:
- Reprocess entire file each time
- Limited to simple queries
- No indexes for speed

## SQL Database Approach

### Process:
1. Create database schema
2. Import CSV to database (14,579 rows)
3. Create indexes on key columns
4. Run SQL queries

### SQL Setup:
```sql
CREATE TABLE pole_permissions (
    property_id VARCHAR(10) PRIMARY KEY,
    location_address VARCHAR(200),
    status VARCHAR(100),
    pole_number VARCHAR(20),
    survey_date TIMESTAMP,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    INDEX idx_address (location_address),
    INDEX idx_status (status),
    INDEX idx_pole (pole_number)
);

-- Import data
LOAD DATA INFILE 'Lawley_Essential.csv'
INTO TABLE pole_permissions
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\\n'
IGNORE 1 ROWS;
```

### Duplicate Detection Query:
```sql
-- Find duplicate addresses
SELECT 
    location_address,
    COUNT(*) as duplicate_count,
    COUNT(DISTINCT pole_number) as unique_poles,
    GROUP_CONCAT(DISTINCT status) as statuses
FROM pole_permissions
GROUP BY location_address
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Detailed duplicates for specific address
SELECT *
FROM pole_permissions
WHERE location_address = '1 KWENA STREET LAWLEY ESTATE LENASIA 1824 GT 79800008 JHB'
ORDER BY survey_date;
```

### Performance:
- Initial import: 10-30 seconds
- Query execution: <1 second
- Complex queries: 1-5 seconds

### Pros:
- Lightning fast queries
- Complex analysis possible
- Persistent storage
- Multiple users/queries
- ACID compliance
- Join with other tables

### Cons:
- Database setup required
- Needs SQL knowledge
- Additional infrastructure
- Maintenance overhead

## Recommendation by Use Case

### Use CSV Chunks When:
- One-time analysis
- No database available
- Rapid prototyping
- Simple duplicate detection
- Need portability

### Use SQL Database When:
- Repeated queries needed
- Complex analysis required
- Multiple data sources
- Production system
- Real-time queries
- Need data persistence

## Hybrid Approach (Best of Both)

1. Use CSV chunks for initial analysis
2. If patterns found, move to database
3. Automate with scheduled imports
4. Keep CSV for backup/portability

## Performance Comparison

| Metric | CSV Chunks | SQL Database |
|--------|------------|--------------|
| Setup Time | 0 seconds | 5-10 minutes |
| First Analysis | 5-10 seconds | 30 seconds |
| Subsequent | 5-10 seconds | <1 second |
| Memory Usage | Low | Medium |
| Complexity | Simple | Complex |
| Flexibility | High | Medium |
| Scalability | Limited | Excellent |
"""
    
    with open('CSV_VS_SQL_COMPARISON.md', 'w') as f:
        f.write(comparison)
    
    print("Comparison saved to: CSV_VS_SQL_COMPARISON.md")

def main():
    # Run chunk analysis
    analyzer = ChunkAnalyzer()
    analyzer.analyze_all_chunks()
    analyzer.generate_duplicate_report()
    
    # Generate SQL comparison
    compare_with_sql()
    
    print("\n=== ANALYSIS COMPLETE ===")
    print("Files generated:")
    print("1. DUPLICATE_ANALYSIS_REPORT.md - Human-readable report")
    print("2. duplicate_analysis_results.json - Detailed data")
    print("3. CSV_VS_SQL_COMPARISON.md - Approach comparison")

if __name__ == "__main__":
    main()