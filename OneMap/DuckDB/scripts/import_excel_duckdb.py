#!/usr/bin/env python3
"""
DuckDB Excel Import Script
Uses pandas to read Excel and DuckDB for fast analytics
"""

import sys
import os
import pandas as pd
import duckdb
from pathlib import Path
from datetime import datetime

# Configuration
DB_PATH = Path(__file__).parent.parent / "data" / "onemap.duckdb"
DB_PATH.parent.mkdir(exist_ok=True)

def import_excel_to_duckdb(excel_path, sheet_name='Sheet1'):
    """Import Excel file to DuckDB using pandas"""
    
    print(f"🦆 DuckDB Excel Import (Python)")
    print(f"📄 File: {excel_path}")
    print(f"📋 Sheet: {sheet_name}")
    
    # Check if file exists
    if not os.path.exists(excel_path):
        print(f"❌ File not found: {excel_path}")
        return False
    
    # Get file size
    file_size_mb = os.path.getsize(excel_path) / (1024 * 1024)
    print(f"📊 File size: {file_size_mb:.2f} MB")
    
    try:
        # Read Excel file with pandas
        print("\n📥 Reading Excel file...")
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
        print(f"✅ Loaded {len(df)} rows, {len(df.columns)} columns")
        
        # Clean column names (remove special characters)
        df.columns = [col.replace(' ', '_').replace(':', '').replace('-', '_') for col in df.columns]
        
        # Show column info
        print("\n📋 Columns found:")
        for i, col in enumerate(df.columns):
            print(f"   {i+1}. {col} ({df[col].dtype})")
        
        # Create DuckDB connection
        print(f"\n🦆 Connecting to DuckDB: {DB_PATH}")
        con = duckdb.connect(str(DB_PATH))
        
        # Create table from DataFrame
        table_name = "excel_import"
        print(f"\n📥 Importing to table: {table_name}")
        con.execute(f"DROP TABLE IF EXISTS {table_name}")
        con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")
        
        # Get import statistics
        row_count = con.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        print(f"✅ Successfully imported {row_count} rows")
        
        # Show sample data
        print("\n📄 Sample data (first 5 rows):")
        sample = con.execute(f"SELECT * FROM {table_name} LIMIT 5").df()
        print(sample)
        
        # Analyze the data
        analyze_data(con, table_name, df.columns)
        
        # Create useful views
        create_views(con, df.columns)
        
        # Close connection
        con.close()
        
        print("\n✅ Import complete!")
        print("\n💡 To query the data:")
        print(f"   duckdb {DB_PATH}")
        print(f"   SELECT * FROM {table_name} LIMIT 10;")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

def analyze_data(con, table_name, columns):
    """Analyze the imported data"""
    print("\n📊 Data Analysis:")
    
    # Look for status columns
    status_cols = [col for col in columns if 'status' in col.lower()]
    if status_cols:
        for col in status_cols:
            print(f"\n📈 Distribution of '{col}':")
            result = con.execute(f"""
                SELECT "{col}", COUNT(*) as count
                FROM {table_name}
                WHERE "{col}" IS NOT NULL
                GROUP BY "{col}"
                ORDER BY count DESC
                LIMIT 10
            """).df()
            print(result)
    
    # Look for date columns
    date_cols = [col for col in columns if 'date' in col.lower()]
    if date_cols:
        for col in date_cols:
            try:
                result = con.execute(f"""
                    SELECT 
                        MIN("{col}") as earliest,
                        MAX("{col}") as latest
                    FROM {table_name}
                    WHERE "{col}" IS NOT NULL
                """).fetchone()
                print(f"\n📅 Date range for '{col}':")
                print(f"   Earliest: {result[0]}")
                print(f"   Latest: {result[1]}")
            except:
                pass
    
    # Look for agent/pole columns
    agent_cols = [col for col in columns if 'agent' in col.lower()]
    pole_cols = [col for col in columns if 'pole' in col.lower()]
    
    if agent_cols:
        col = agent_cols[0]
        print(f"\n👥 Top 10 by '{col}':")
        result = con.execute(f"""
            SELECT "{col}", COUNT(*) as count
            FROM {table_name}
            WHERE "{col}" IS NOT NULL
            GROUP BY "{col}"
            ORDER BY count DESC
            LIMIT 10
        """).df()
        print(result)
    
    if pole_cols:
        col = pole_cols[0]
        unique_count = con.execute(f"""
            SELECT COUNT(DISTINCT "{col}") 
            FROM {table_name}
            WHERE "{col}" IS NOT NULL
        """).fetchone()[0]
        print(f"\n📍 Unique {col}: {unique_count}")

def create_views(con, columns):
    """Create useful views for analysis"""
    print("\n📊 Creating analysis views...")
    
    # Create a summary view if we have status and date columns
    status_col = next((col for col in columns if 'status' in col.lower()), None)
    date_col = next((col for col in columns if 'date' in col.lower()), None)
    
    if status_col and date_col:
        con.execute(f"""
            CREATE OR REPLACE VIEW status_summary AS
            SELECT 
                DATE_TRUNC('month', "{date_col}") as month,
                "{status_col}" as status,
                COUNT(*) as count
            FROM excel_import
            WHERE "{date_col}" IS NOT NULL
            GROUP BY month, status
            ORDER BY month DESC, count DESC
        """)
        print("✅ Created view: status_summary")
    
    print("✅ Views created successfully")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_excel_duckdb.py <excel_file> [sheet_name]")
        print("Example: python import_excel_duckdb.py data/onemap.xlsx 'Sheet1'")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    sheet_name = sys.argv[2] if len(sys.argv) > 2 else 'Sheet1'
    
    success = import_excel_to_duckdb(excel_file, sheet_name)
    sys.exit(0 if success else 1)