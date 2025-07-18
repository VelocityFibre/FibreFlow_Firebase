# Agent Test Queries with Expected Answers

## Lawley Project (Law-001) - Verified Data

### Basic Project Queries

**Query 1**: "How many total poles are in the Lawley project?"
- **Expected Answer**: 4,468 poles
- **Verifies**: Database connection, project detection

**Query 2**: "What's the breakdown of pole types for Law-001?"
- **Expected Answer**: 
  - Feeder poles: 2,107 (140-160mm diameter)
  - Distribution poles: 2,361 (120-140mm diameter)
- **Verifies**: Detailed data retrieval

**Query 3**: "How many drops are connected to Lawley poles?"
- **Expected Answer**: 23,708 total drops
  - Active drops (with ONT): 20,109
  - Spare drops: 3,599
- **Verifies**: Related data queries

### Zone-Specific Queries

**Query 4**: "How many poles are in Zone 12 of Lawley?"
- **Expected Answer**: 377 poles
- **Verifies**: Filtered queries, zone detection

**Query 5**: "Which zones have the most poles in Law-001?"
- **Expected Answer**: 
  - Zone 12: 377 poles
  - Zone 18: 367 poles
  - Zone 8: 358 poles
- **Verifies**: Aggregation queries

### Specific Pole Queries

**Query 6**: "Show me details for pole LAW.P.A002"
- **Expected Answer**: 
  - Type: Feeder pole
  - Zone: 1
  - PON: 1
  - Drops: 8
  - GPS: -26.37844683, 27.80865019
- **Verifies**: Individual record lookup

**Query 7**: "Find pole LAW.P.C715"
- **Expected Answer**:
  - Zone: 11
  - PON: 138
  - Should have drop connections
- **Verifies**: Pole ID pattern matching

### Capacity and Utilization

**Query 8**: "How many poles have exactly 8 drops?"
- **Expected Answer**: 2,962 poles
- **Verifies**: Complex filtering

**Query 9**: "What's the average number of drops per pole in Lawley?"
- **Expected Answer**: 8.0 drops per pole
- **Verifies**: Calculation capabilities

**Query 10**: "How many poles don't have any drops?"
- **Expected Answer**: 1,503 poles (33.6%)
- **Verifies**: Null/empty handling

### PON Queries

**Query 11**: "Which PON has the most poles?"
- **Expected Answer**: PON 138 with 36 poles
- **Verifies**: PON data integration

**Query 12**: "List poles on PON 144"
- **Expected Answer**: 34 poles total
- **Verifies**: PON filtering

### Summary Statistics

**Query 13**: "Give me a summary of the Lawley project"
- **Expected Answer Should Include**:
  - 4,468 total poles
  - 2,965 poles with drops (66.4%)
  - 23,708 total drops
  - 20 zones
  - 212 PONs
  - 100% GPS coverage
- **Verifies**: Comprehensive data aggregation

## Quick Test Sequence

Copy and paste these in order:

1. `How many poles are in project Law-001?`
   - Should return: 4,468

2. `What percentage have drops connected?`
   - Should return: 66.4% (2,965 poles)

3. `Which zone has the most poles?`
   - Should return: Zone 12 with 377 poles

4. `Do you remember what project we're talking about?`
   - Should return: Reference to Lawley/Law-001

## Red Flags (Agent NOT Working)

❌ Returns "284 poles" for Lawley (this was the hallucinated number)
❌ Says "I don't have access to specific data"
❌ Generic responses without actual numbers
❌ CORS errors in browser console
❌ No mention of specific zones, PONs, or pole IDs

## Green Flags (Agent IS Working)

✅ Returns 4,468 as total pole count
✅ Mentions specific zones (1-20)
✅ References actual pole IDs (LAW.P.XXXX format)
✅ Provides percentages and calculations
✅ Remembers previous queries
✅ Console shows successful Firebase queries

## Advanced Verification

If basic queries work, try these complex ones:

1. `Show me all feeder poles in Zone 3 with more than 6 drops`
2. `Calculate the utilization rate for distribution poles`
3. `Which poles are connected to PON 138 in Zone 11?`
4. `Find poles near GPS coordinates -26.378, 27.808`

These require the agent to:
- Parse complex queries
- Filter by multiple criteria
- Perform calculations
- Handle GPS queries