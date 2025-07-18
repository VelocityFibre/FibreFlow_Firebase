# User-Friendly Pole Analytics Agent Design

## Overview
AI agent designed for non-technical users to process OneMap data with natural language guidance and intelligent assistance.

## Agent Persona

### System Prompt
```
You are a friendly data analyst assistant specializing in pole permission tracking. 
Your users are project managers and field supervisors who need to process OneMap data but may not be technically skilled.

Your role is to:
1. Guide users through data processing step-by-step
2. Explain what you're doing in simple terms
3. Catch and explain errors clearly
4. Provide actionable insights
5. Always ask before making assumptions

Be conversational, patient, and thorough in your explanations.
```

## User Interaction Flow

### Step 1: File Upload & Initial Analysis
**User**: *Uploads CSV file*
**Agent**: 
> "I've received your OneMap file with 15,496 records. Let me analyze it first...
> 
> ✅ Found 5,287 records with pole permission data
> ⚠️ Noticed 3 different date formats - I'll handle this automatically
> ✅ All required columns are present
> 
> What would you like to focus on?
> 1. Monthly breakdown of approvals
> 2. Weekly activity reports  
> 3. Agent performance analysis
> 4. Custom date range analysis"

### Step 2: Processing with Live Updates
**User**: "I need a monthly breakdown"
**Agent**: 
> "Perfect! I'll create monthly reports for you. Let me process this step by step:
> 
> 🔄 Filtering for approved pole permissions... (5,287 → 5,287 records)
> 🔄 Removing duplicates by pole number... (5,287 → 3,732 unique poles)
> 🔄 Validating agent assignments... (Found 156 mismatches - I'll flag these)
> 🔄 Creating monthly breakdowns...
> 
> ✅ Processing complete! Here's what I found:
> 
> **Monthly Breakdown:**
> - April 2025: 116 approvals
> - May 2025: 896 approvals  
> - June 2025: 1,814 approvals (peak month!)
> - July 2025: 906 approvals
> 
> The June spike looks significant - would you like me to investigate what caused it?"

### Step 3: Intelligent Error Handling
**User**: "The June numbers seem too high"
**Agent**: 
> "Good catch! Let me double-check the June data...
> 
> 🔍 Analyzing June 2025 (1,814 approvals):
> - Week ending June 8: 1,237 approvals (68% of the month!)
> - Most approvals by agent: Sarah Johnson (234)
> - Most approvals in one day: June 6 (412 approvals)
> 
> This pattern suggests a bulk approval event. Possible causes:
> 1. System backlog was cleared
> 2. Bulk import from another system
> 3. Data entry catch-up after system downtime
> 
> Would you like me to:
> 1. Generate a detailed June report
> 2. Flag this in the summary
> 3. Exclude June from trend analysis"

### Step 4: Report Generation with Explanations
**User**: "Generate the reports"
**Agent**: 
> "Creating your reports now! I'll generate 4 files:
> 
> 📊 **Main Reports:**
> 1. Monthly_Breakdown_2025.xlsx - Your requested monthly analysis
> 2. All_First_Approvals.xlsx - Complete dataset (3,732 poles)
> 
> 🔍 **Quality Control:**
> 3. Duplicate_Poles_Removed.xlsx - 1,555 duplicates I filtered out
> 4. Agent_Validation_Issues.xlsx - 156 agent mismatches to review
> 
> 📈 **Key Insights:**
> - Peak approval period: June 1-8, 2025
> - Most active agent: Sarah Johnson (234 approvals)
> - Data quality score: 94% (very good!)
> - Trend: Steady increase April→June, then normal in July
> 
> All files are ready for download. Would you like me to explain any specific findings?"

## Technical Implementation

### Agent Tools
```typescript
const agentTools = [
  {
    name: "process_csv",
    description: "Process OneMap CSV file and extract pole permission data",
    input_schema: {
      type: "object",
      properties: {
        file_content: { type: "string" },
        target_status: { type: "string", default: "Pole Permission: Approved" }
      }
    }
  },
  {
    name: "generate_report",
    description: "Generate Excel report with specified analysis",
    input_schema: {
      type: "object",
      properties: {
        report_type: { type: "string", enum: ["monthly", "weekly", "complete", "custom"] },
        date_range: { type: "object", optional: true }
      }
    }
  },
  {
    name: "validate_data",
    description: "Validate processed data and provide quality score",
    input_schema: {
      type: "object",
      properties: {
        data: { type: "object" },
        validation_level: { type: "string", enum: ["basic", "thorough"] }
      }
    }
  }
];
```

### Conversation Management
```typescript
interface ConversationState {
  uploadedFile?: File;
  processedData?: ProcessedPoleData;
  userPreferences: {
    reportTypes: string[];
    dateRange?: { start: Date; end: Date };
    notificationLevel: 'minimal' | 'detailed' | 'verbose';
  };
  validationResults?: ValidationReport;
  downloadableReports: string[];
}
```

### Error Handling with User-Friendly Messages
```typescript
const errorMessages = {
  'missing_columns': "I notice some required columns are missing from your CSV. The OneMap export should include columns like 'Pole Number', 'Flow Name Groups', and 'lst_mod_dt'. Can you try re-exporting with all columns included?",
  
  'date_format_error': "I'm having trouble reading some of the dates in your file. They appear to be in an unusual format. This is usually fixable - shall I try different date parsing methods?",
  
  'no_pole_permissions': "I looked through your file but couldn't find any records with 'Pole Permission: Approved' status. Are you sure this is the correct file? Sometimes the status column has slightly different wording.",
  
  'duplicate_overload': "I found an unusually high number of duplicate entries (over 50%). This might indicate a data export issue. Would you like me to proceed anyway or would you prefer to check the source data first?"
};
```

## Benefits for Non-Technical Users

### 1. **Guided Experience**
- No need to understand complex data processing
- Agent explains each step in plain language
- Automatic error detection and correction

### 2. **Intelligent Assistance**
- Spots anomalies and asks for clarification
- Suggests next steps based on data patterns
- Provides context for unusual findings

### 3. **Trust Building**
- Shows reasoning behind decisions
- Explains what validation checks were performed
- Provides confidence scores for results

### 4. **Customizable Output**
- Generates reports based on user needs
- Adapts explanation detail level
- Remembers user preferences

### 5. **Error Recovery**
- Explains problems in user-friendly terms
- Suggests solutions
- Offers alternatives when processing fails

## Example User Sessions

### Scenario 1: First-Time User
**User**: "I have this CSV file I need to analyze"
**Agent**: "Welcome! I'm here to help you analyze your OneMap data. I can see you've uploaded a file - let me take a look and guide you through the process..."

### Scenario 2: Regular User
**User**: "Same as last time but for July data"
**Agent**: "Perfect! I remember you wanted monthly breakdowns with agent validation. Let me process your July data using the same format..."

### Scenario 3: Problem Solving
**User**: "The numbers don't look right"
**Agent**: "Let me investigate. I'll check the data quality and walk you through what I'm finding step by step..."

## Implementation Timeline

### Week 1: Core Agent
- Basic CSV processing
- Natural language responses
- Simple report generation

### Week 2: Intelligence Layer
- Error detection and explanation
- Anomaly identification
- Data quality scoring

### Week 3: User Experience
- Conversation state management
- Preference learning
- Advanced explanations

### Week 4: Integration
- UI integration
- Report download
- Testing with real users

This approach transforms complex data processing into a guided, conversational experience that non-technical users can easily navigate and trust.