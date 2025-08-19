# Connecting Pole Analytics API to Power BI

## API Details
- **Base URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress`
- **API Token**: `fibreflow-pole-analytics-2025`

## Method 1: Using Power BI Desktop (Recommended)

### Step 1: Open Power BI Desktop
1. Open Power BI Desktop
2. Click **"Get Data"** → **"Web"**

### Step 2: Configure the Connection
1. Select **"Advanced"** option
2. Fill in the URL parts:
   - **URL parts**: 
     ```
     https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics
     ```
3. Add URL parameters:
   - Click **"Add part"**
   - Add: `?token=fibreflow-pole-analytics-2025&days=30`

Your complete URL will be:
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics?token=fibreflow-pole-analytics-2025&days=30
```

### Step 3: Load the Data
1. Click **"OK"**
2. Power BI will connect and show a preview
3. You'll see the JSON structure
4. Click on **"data"** to expand the records
5. Click **"To Table"** to convert JSON to table format
6. Expand columns as needed

## Method 2: Using Power Query M Language

In Power BI, go to **"Get Data"** → **"Blank Query"** → **"Advanced Editor"** and paste:

```powerquery
let
    // API Configuration
    BaseUrl = "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress",
    ApiToken = "fibreflow-pole-analytics-2025",
    Days = "30",
    
    // Build the URL
    FullUrl = BaseUrl & "/analytics?token=" & ApiToken & "&days=" & Days,
    
    // Make the API call
    Source = Json.Document(Web.Contents(FullUrl)),
    
    // Extract the data
    Data = Source[data],
    
    // Convert to table
    DataTable = Record.ToTable(Data),
    
    // Expand status breakdown
    ExpandedStatus = Table.ExpandRecordColumn(DataTable, "Value", {"statusBreakdown"}, {"statusBreakdown"}),
    
    // Final cleanup
    FinalTable = Table.TransformColumnTypes(ExpandedStatus, {{"Name", type text}, {"statusBreakdown", type any}})
in
    FinalTable
```

## Method 3: Using Headers (More Secure)

For better security, use headers instead of URL parameters:

```powerquery
let
    Url = "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics?days=30",
    
    Source = Json.Document(
        Web.Contents(Url, [
            Headers = [
                #"X-API-Token" = "fibreflow-pole-analytics-2025",
                #"Content-Type" = "application/json"
            ]
        ])
    ),
    
    Data = Source[data],
    
    // Create main metrics table
    MetricsTable = Table.FromRecords({[
        TotalPoles = Data[totalPoles],
        CompletedPoles = Data[estimatedCompleted],
        RemainingPoles = Data[remainingPoles],
        CompletionPercentage = Data[completionPercentage]
    ]}),
    
    // Create status breakdown table
    StatusBreakdown = Record.ToTable(Data[statusBreakdown]),
    StatusTable = Table.RenameColumns(StatusBreakdown, {{"Name", "Status"}, {"Value", "Count"}})
in
    MetricsTable  // Change to StatusTable to see status breakdown
```

## Available Endpoints for Power BI

1. **Summary** (Simple total count):
   ```
   /summary?token=fibreflow-pole-analytics-2025
   ```

2. **Full Analytics** (Detailed breakdown):
   ```
   /analytics?token=fibreflow-pole-analytics-2025&days=30
   ```

3. **Filtered by Project**:
   ```
   /analytics?token=fibreflow-pole-analytics-2025&projectId=PROJECT_ID
   ```

## Creating a Power BI Dashboard

Once connected, you can create:
1. **Card Visuals** for:
   - Total Poles
   - Completion Percentage
   - Remaining Poles

2. **Pie Chart** for:
   - Status Breakdown

3. **Gauge** for:
   - Completion Progress

## Refresh Settings

1. In Power BI Desktop: **"Transform Data"** → **"Data Source Settings"**
2. Select your API source
3. Click **"Edit Permissions"**
4. Set **"Privacy Level"** to "Public"
5. In Power BI Service: Set up scheduled refresh (requires Pro license)

## Testing the Connection

Before using in production:
1. Test in Power BI Desktop first
2. Verify data loads correctly
3. Test refresh functionality
4. Publish to Power BI Service

## Troubleshooting

**Error: "Unable to connect"**
- Check your internet connection
- Verify the API token is correct
- Ensure the URL is exactly as shown

**Error: "Access to the resource is forbidden"**
- The API token might be wrong
- Use the exact token: `fibreflow-pole-analytics-2025`

**No data showing**
- Expand the "data" record in Power Query
- Check if you're looking at the right table

## Example Power BI Report

After connecting, you can create reports showing:
- Total poles in the system: 10,875
- Poles by status (Permission granted vs not granted)
- Completion trends over time
- Project-specific analytics

---
*For additional help, contact the FibreFlow development team*