# Research and Resources Needed for API Development

*Date: 2025-08-16*  
*Purpose: Guide for gathering information that will enhance API development*

## What I Already Know ✅

### Technical Knowledge
- REST API design principles
- Firebase Functions architecture
- Express.js middleware patterns
- Authentication strategies (JWT, OAuth, Firebase Auth)
- Input validation and sanitization
- Error handling patterns
- Rate limiting strategies
- CORS configuration
- TypeScript/JavaScript

### What I Can Build Without Additional Resources
- Basic CRUD endpoints
- Authentication middleware
- Validation logic
- Standard error responses
- Database operations (Firestore)
- File upload handling
- Real-time subscriptions

## What Would Help Me Build Better APIs 🎯

### 1. **Business Logic Documentation**

#### Pole Data Validation Rules
**What I need to know:**
- Exact pole number format (regex pattern)
- Valid pole number prefixes by area
- GPS coordinate boundaries for projects
- Required photo types and minimum quality
- Business rules for duplicate detection

**Example questions:**
```
- Is "LAW.P.B167" the only valid format?
- Can pole numbers have lowercase?
- What's the maximum distance a pole can be from project boundary?
- How do we handle poles captured at wrong GPS location?
```

#### Workflow Rules
**What I need to know:**
- Who can approve staging data?
- What fields can be edited after approval?
- Automatic approval criteria
- Escalation rules for conflicts
- SLA for data validation

**Create a document like:**
```markdown
# Pole Validation Business Rules

## Pole Number Format
- Pattern: `^[A-Z]{3}\.P\.[A-Z]\d{3}$`
- Example: LAW.P.B167
- Prefixes: LAW (Lawley), MOH (Mohadin), etc.

## GPS Validation
- Must be within 50m of planned location
- If >50m, flag for manual review
- Accuracy must be <10m

## Photo Requirements
- Minimum 6 photos required
- Types: before, front, side, depth, concrete, compaction
- Minimum resolution: 1024x768
- Maximum age: 24 hours
```

### 2. **Neon Database Schema**

**What I need:**
```sql
-- Your Neon database schema
CREATE TABLE poles (
  id SERIAL PRIMARY KEY,
  pole_number VARCHAR(20) UNIQUE,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  -- etc...
);

-- Include all tables, indexes, and relationships
```

**Why this helps:**
- I can write optimized queries
- Understand relationships
- Plan data synchronization
- Design analytics endpoints

### 3. **Integration Requirements**

#### Power BI Connection
**What I need to know:**
- What specific data does Power BI need?
- Required response format (JSON structure)
- Refresh frequency expectations
- Authentication method (API key format)
- Any specific calculated fields needed

**Example document:**
```markdown
# Power BI Integration Requirements

## Dashboard KPIs
1. Total poles installed by day/week/month
2. Installation rate by contractor
3. Quality score by area
4. Average time from capture to approval

## Data Format
{
  "metrics": {
    "period": "2025-08-16",
    "installations": 45,
    "approvalRate": 0.89
  }
}
```

#### External System APIs
**If connecting to other systems:**
- API documentation
- Authentication methods
- Rate limits
- Data formats
- Error codes

### 4. **Security & Compliance Requirements**

**What I need to know:**
- Data privacy requirements (POPIA compliance?)
- Audit trail requirements
- Data retention policies
- Encryption requirements
- IP whitelisting needs

**Example:**
```markdown
# Security Requirements

## Data Privacy
- No PII in logs
- Encrypt sensitive fields
- 90-day data retention

## Audit Requirements
- Log all data modifications
- Track user actions
- Immutable audit trail
```

### 5. **Performance Requirements**

**What I need to know:**
- Expected number of field workers
- Peak usage times
- Acceptable response times
- Data volume projections
- Offline sync batch sizes

**Example:**
```markdown
# Performance Targets

## Load Expectations
- 500 concurrent field workers
- 10,000 API calls/hour peak
- <200ms response time (95th percentile)
- 100 poles per sync batch maximum
```

### 6. **Error Scenarios and Business Logic**

**What happens when:**
- Duplicate pole numbers detected?
- GPS location doesn't match plan?
- Photos are missing/corrupt?
- Network fails during sync?
- Validation conflicts occur?

**Document like:**
```markdown
# Error Handling Scenarios

## Duplicate Pole Number
- Check if same user (allow update)
- Check if different user (flag for review)
- Auto-merge if GPS within 5m
- Escalate if GPS differs >5m
```

## Resources That Would Be Helpful 📚

### 1. **Existing System Documentation**
- Current Firestore data models
- Firebase security rules
- Existing validation logic in Angular services
- Current user roles and permissions

### 2. **Sample Data**
- Example pole records (all fields)
- Valid/invalid test cases
- Edge cases that caused issues
- Production data samples (anonymized)

### 3. **API Examples from Similar Systems**
If you have examples from:
- Other field data collection systems
- Utility company APIs
- Geographic data systems
- Offline-first mobile apps

### 4. **Specific Technology Decisions**
- Preferred error code format
- Logging requirements (format, retention)
- Monitoring tools (Sentry, DataDog?)
- API versioning strategy
- Documentation format (OpenAPI/Swagger?)

## How to Provide This Information

### Option 1: Create Documents
Create these files in the `api/docs/` folder:
- `business-rules.md`
- `neon-schema.sql`
- `integration-requirements.md`
- `security-requirements.md`
- `performance-targets.md`

### Option 2: Answer Templates
Fill in these templates:

```markdown
## Pole Number Validation
Format: _______________
Valid prefixes: _______________
Case sensitive: Yes/No
Examples of valid: _______________
Examples of invalid: _______________

## GPS Validation
Max distance from plan: _____m
Required accuracy: _____m
Boundary check: Yes/No
Project area restriction: Yes/No

## Photo Requirements
Minimum count: _____
Required types: _______________
Max file size: _____MB
Accepted formats: _______________
```

### Option 3: Existing Code Review
Point me to:
- Current validation functions
- Service files with business logic
- Model definitions
- Configuration files

## What This Enables

With this information, I can:

1. **Build Smarter Validation**
   - Catch errors before they reach staging
   - Provide specific error messages
   - Auto-fix common issues

2. **Optimize Performance**
   - Right-size rate limits
   - Implement proper caching
   - Design efficient batch operations

3. **Ensure Compliance**
   - Meet all security requirements
   - Proper audit trails
   - Correct data handling

4. **Better Integration**
   - Exact format for Power BI
   - Proper Neon queries
   - Seamless sync with existing systems

## Priority Information

**Must Have** (Blocks development):
1. Pole number format/validation rules
2. Required fields for pole records
3. User roles and permissions

**Should Have** (Improves quality):
1. Neon database schema
2. Business workflow rules
3. Error handling scenarios

**Nice to Have** (Optimizations):
1. Performance targets
2. Integration specifications
3. Sample data

---

## Quick Start

Don't feel overwhelmed! Start with:

1. **One validation rule** (e.g., pole number format)
2. **Basic field list** (what data must be captured)
3. **Simple workflow** (capture → validate → approve)

We can build iteratively and add complexity as we learn more about the business requirements.

Would you like me to create template documents for any of these areas?