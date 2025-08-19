# Nokia Network Data Management System

## Overview
This system manages Nokia network equipment data including ONT performance monitoring, signal measurements, and equipment status tracking.

## Data Structure
- **Source**: Nokia Export.xlsx (5,347+ records)
- **Database**: Neon PostgreSQL `nokia_data` table
- **Display**: AG Grid component at `/nokia-data`

## Key Features
- Excel import functionality
- Real-time signal monitoring data
- GPS coordinate tracking
- Team assignment tracking
- Equipment status monitoring
- Project-based filtering

## Data Fields
- Drop Numbers (DR1749954, etc.)
- Serial Numbers (Nokia equipment IDs)
- Signal measurements (dBm readings)
- OLT/ONT network addressing
- GPS coordinates
- Team assignments
- Performance metrics

## Related Systems
- Links to existing projects via project_id
- Potential relationships with SOW and pole tracker data
- Team assignments correlate with contractor data

## Import Process
1. Upload Nokia Export.xlsx file
2. Validate data structure
3. Process and insert into Neon database
4. Display in AG Grid with filtering/search

Last Updated: 2025-01-30