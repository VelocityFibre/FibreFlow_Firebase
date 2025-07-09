# Agent Payment Verification - Business Context

## The Problem
Velocity Fibre needs to prevent duplicate payments to agents for pole permissions.

## Business Process
1. **Client agents** visit homes in informal settlements
2. **Get permission** from homeowners to install fiber poles  
3. **Record** pole permission in the system
4. **Velocity Fibre pays** agents for each pole permission
5. **Risk**: Multiple agents claiming payment for the same pole

## Why This Happens
- Working in **high-density informal settlements**
- **Addresses are unreliable** (informal, duplicated, non-standard)
- **Same pole** may appear with different address descriptions
- **Multiple agents** might visit same area and claim same poles

## Current Data Shows
- **48% of poles** (1,811 out of 3,770) appear at multiple locations
- **63% of records** missing agent names
- Cannot verify who should be paid

## The Solution: GPS-Based Verification

### Core Principle
- **IGNORE** address fields (unreliable)
- **USE** GPS coordinates as truth (specifically "Latitude" and "Longitude" fields)
- **IGNORE** "Actual Device Location" fields (device GPS can be inaccurate)
- **MATCH** poles by pole number + GPS location

### Analysis Approach
1. Find all "Pole Permission: Approved" records
2. Group by pole number
3. Identify poles claimed by multiple agents
4. Use GPS to verify if truly same location
5. Flag payment conflicts for review

### Expected Outputs
- **High Risk List**: Poles with multiple agents claiming permission
- **Agent Summary**: Which agents have most conflicts  
- **Payment Hold List**: Poles to investigate before payment
- **Verification Report**: Details for follow-up with agents

## Success Metrics
- Zero duplicate payments processed
- All payment conflicts identified before payment run
- Clear audit trail for payment decisions
- Improved data quality going forward