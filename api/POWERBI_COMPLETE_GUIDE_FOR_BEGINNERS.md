# Complete Power BI Connection Guide for FibreFlow APIs

## What You'll Need
1. **Power BI Desktop** (free download from Microsoft)
2. **Your API endpoints and tokens**

## Step 1: Download and Install Power BI Desktop

1. Go to: https://powerbi.microsoft.com/desktop/
2. Click "Download free"
3. Install the application
4. Open Power BI Desktop

## Step 2: Your Available APIs

### Working API (Pole Analytics):
- **URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics`
- **Token**: `fibreflow-pole-analytics-2025`
- **Status**: ✅ Working and tested

### Neon Database API:
- **URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI`
- **Token**: `dev-api-key-12345`
- **Status**: ❌ Needs to be made public (same process as before)

## Step 3: Connect Power BI to the Working API (Pole Analytics)

### Method A: Simple URL Method (Easiest for Beginners)

1. **Open Power BI Desktop**

2. **Click "Get Data"**
   - It's in the Home ribbon at the top
   - Or use Ctrl+Shift+G

3. **Select "Web"**
   - In the search box, type "Web"
   - Click on "Web" 
   - Click "Connect"

4. **Enter the URL**
   - Select "Basic" (not Advanced)
   - Paste this complete URL:
   ```
   https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics?token=fibreflow-pole-analytics-2025&days=30
   ```
   - Click "OK"

5. **Preview Your Data**
   - Power BI will connect and show a preview
   - You'll see something like "Record" or "List"
   - Click on the word "Record" to see inside

6. **Navigate to Your Data**
   - Click on "data" (this contains your actual data)
   - You'll see another "Record"
   - Click "Into Table" button (top left)

7. **Expand Your Data**
   - Click the expand button (⤢) next to "Column1"
   - Select which fields you want
   - Click "OK"

8. **Load the Data**
   - Click "Close & Apply" (top left)
   - Your data is now in Power BI!

### Method B: Using Power Query (More Control)

1. **Get Data → Blank Query**

2. **Open Advanced Editor**
   - Right-click on "Query1" in the Queries pane
   - Select "Advanced Editor"

3. **Paste This Code**:
```powerquery
let
    // Configuration
    ApiUrl = "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics?token=fibreflow-pole-analytics-2025&days=30",
    
    // Get data from API
    Source = Json.Document(Web.Contents(ApiUrl)),
    
    // Extract the data section
    Data = Source[data],
    
    // Convert to a list of records for the main metrics
    MainMetrics = {
        [Metric = "Total Poles", Value = Data[totalPoles]],
        [Metric = "Completed Poles", Value = Data[estimatedCompleted]],
        [Metric = "Remaining Poles", Value = Data[remainingPoles]],
        [Metric = "Completion %", Value = Data[completionPercentage]]
    },
    
    // Convert to table
    MetricsTable = Table.FromRecords(MainMetrics)
in
    MetricsTable
```

4. **Click "Done"**
5. **Click "Close & Apply"**

## Step 4: Create Your First Visualization

1. **Select a Visual**
   - Look at the Visualizations pane (right side)
   - Click on "Card" visual (looks like 123)

2. **Add Data to Visual**
   - Drag "Value" field to the card
   - It will show one of your metrics

3. **Create Multiple Cards**
   - Click on blank canvas area
   - Add another Card visual
   - Drag different values to each card

4. **Add a Pie Chart**
   - For status breakdown, you'll need to modify the query
   - This shows the distribution of pole statuses

## Step 5: Setting Up Automatic Refresh

1. **Save Your Report**
   - File → Save As
   - Give it a name like "Pole Analytics Dashboard"

2. **Configure Refresh Settings**
   - File → Options and settings → Data source settings
   - Select your API source
   - Click "Edit Permissions"
   - Set Privacy Level to "Public"

## Step 6: Connect to Neon Database API (Once It's Public)

The Neon API needs to be made public first. Run this in Google Cloud Shell:
```bash
gcloud functions add-iam-policy-binding neonReadAPI \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf
```

Then use these endpoints in Power BI:
- `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/poles`
- `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/projects`
- `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonReadAPI/api/v1/analytics/summary`

## Common Issues and Solutions

### "Unable to connect to data source"
- Check your internet connection
- Verify the URL is exactly as shown
- Make sure you included the token in the URL

### "We couldn't parse the input"
- Make sure you're using Web connector, not something else
- Check that the URL is complete with ?token=...

### "Access to resource is forbidden"
- The API isn't public yet
- Token is incorrect
- URL is wrong

### Data looks weird or nested
- This is normal for JSON data
- Use the expand (⤢) buttons to drill into the data
- Convert Records to Tables when needed

## Tips for Beginners

1. **Start Simple**
   - Get one number working first (like Total Poles)
   - Then add more complexity

2. **Save Often**
   - Power BI Desktop can crash
   - Save your work frequently

3. **Use Cards First**
   - Cards are the simplest visual
   - Just shows a single number
   - Great for KPIs like "Total Poles"

4. **Test in Desktop First**
   - Get everything working locally
   - Then publish to Power BI Service (if you have it)

## Your First Dashboard Should Show:

1. **Total Poles**: 10,875
2. **Completion Percentage**: 0%
3. **Status Breakdown**: Pie chart of different statuses
4. **Remaining Poles**: 10,875

## Next Steps

1. **Add More APIs**
   - Once Neon API is public, connect to it
   - Combine data from multiple APIs

2. **Create Relationships**
   - Link data from different APIs
   - Create comprehensive reports

3. **Schedule Refresh**
   - Set up automatic data updates
   - Requires Power BI Pro license

## Need Help?

The working API URL for testing:
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics?token=fibreflow-pole-analytics-2025&days=30
```

Just paste this into your browser to see the data structure.

---
*Remember: The key is to start simple and build up. Get one number showing correctly, then add more complexity.*