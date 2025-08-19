# Complete Power BI Guide: Dual Database Access

## 🎯 **COMPLETE DATA ACCESS FOR MANAGEMENT**

You now have TWO comprehensive APIs that give Power BI access to ALL your data:

## 🗄️ **Database Coverage:**

### 1. **Neon Database API** (PostgreSQL)
**URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonDataWarehouse/all-data?apikey=powerbi-data-warehouse-2025`

**Contains**:
- OneMap Excel imports (status history, pole permissions)
- SOW data (scopes of work)
- Project poles, drops, fibre infrastructure
- Import batches and tracking
- Status change history

### 2. **Firebase Database API** (Firestore) 
**URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/firebaseDataWarehouse/all-data?apikey=powerbi-firebase-warehouse-2025`

**Contains**:
- Projects and phases
- Tasks and workflow
- Staff and contractors
- Materials and stock management
- BOQ (Bill of Quantities)
- Quotes and RFQs
- Meetings and action items
- Daily progress tracking

## 🔐 **Security & Access:**
- ✅ **READ-ONLY** - Cannot modify any data
- ✅ **API Key protected** - Secure access
- ✅ **Management safe** - Perfect for executive reporting

## 📊 **Power BI Connection Methods:**

### Method 1: Connect to Both APIs Separately

**Step 1: Connect to Neon Data**
1. Power BI Desktop → Get Data → Web
2. URL: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonDataWarehouse/all-data?apikey=powerbi-data-warehouse-2025`
3. Name this source: "Neon Data"

**Step 2: Connect to Firebase Data** 
1. Power BI Desktop → Get Data → Web  
2. URL: `https://us-central1-fibreflow-73daf.cloudfunctions.net/firebaseDataWarehouse/all-data?apikey=powerbi-firebase-warehouse-2025`
3. Name this source: "Firebase Data"

**Step 3: Create Relationships**
- Link projects between both databases
- Create unified views combining both data sources

### Method 2: Power Query Script (Advanced)

```powerquery
let
    // Neon Database Connection
    NeonUrl = "https://us-central1-fibreflow-73daf.cloudfunctions.net/neonDataWarehouse/all-data?apikey=powerbi-data-warehouse-2025",
    NeonSource = Json.Document(Web.Contents(NeonUrl)),
    NeonData = NeonSource[data],
    
    // Firebase Database Connection  
    FirebaseUrl = "https://us-central1-fibreflow-73daf.cloudfunctions.net/firebaseDataWarehouse/all-data?apikey=powerbi-firebase-warehouse-2025",
    FirebaseSource = Json.Document(Web.Contents(FirebaseUrl)),
    FirebaseData = FirebaseSource[data],
    
    // Combine specific tables you need
    Projects_Neon = Table.FromRecords(NeonData[projects]),
    Projects_Firebase = Table.FromRecords(FirebaseData[projects]),
    
    // Create unified project view
    UnifiedProjects = Table.Union({Projects_Neon, Projects_Firebase}),
    
    // Return the table you want
    Result = UnifiedProjects
in
    Result
```

## 📈 **Management Dashboards You Can Create:**

### **Executive Summary Dashboard**
- Total projects across both systems
- Pole installation progress (from Neon)
- Task completion rates (from Firebase) 
- Staff utilization (from Firebase)
- Import processing status (from Neon)

### **Operations Dashboard**
- Daily progress tracking
- Material stock levels
- Contractor performance
- Meeting action items
- Pole permission status

### **Financial Dashboard**
- Project costs and budgets
- Material allocations
- Contractor payments
- BOQ progress and quotes

### **Field Operations Dashboard**
- Pole installations by location
- Staff assignments and workload
- Equipment and material needs
- Quality control metrics

## 🛠 **Setup Instructions:**

### **Step 1: Make Both APIs Public**
Run these commands in Google Cloud Shell:

```bash
# Make Neon API public (if not done already)
gcloud functions add-iam-policy-binding neonDataWarehouse \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf

# Make Firebase API public  
gcloud functions add-iam-policy-binding firebaseDataWarehouse \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf
```

### **Step 2: Test Both APIs**
Open these URLs in your browser to test:

1. **Neon API**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonDataWarehouse/health?apikey=powerbi-data-warehouse-2025`

2. **Firebase API**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/firebaseDataWarehouse/health?apikey=powerbi-firebase-warehouse-2025`

Both should return JSON (not error pages).

### **Step 3: Connect Power BI**
1. Download Power BI Desktop
2. Use the connection methods above
3. Create your first dashboard combining both data sources

## 🔄 **Data Refresh Strategy:**

### **Automated Refresh** (Power BI Pro required)
- Set up scheduled refresh in Power BI Service
- Both APIs will pull latest data automatically
- Recommended: Refresh every 4-6 hours

### **Manual Refresh**
- Click "Refresh" in Power BI Desktop
- All data updates from both databases
- Takes 1-2 minutes depending on data size

## 🎯 **Key Benefits for Management:**

✅ **Complete Picture** - See ALL your data in one place  
✅ **Real-time Insights** - Always up-to-date information  
✅ **Cross-database Analysis** - Compare Neon vs Firebase data  
✅ **No IT Dependency** - Refresh data without technical team  
✅ **Future-proof** - Add new tables without changing reports  
✅ **Secure Access** - Read-only, no risk of data corruption  

## 📋 **Sample Report Templates:**

### **Weekly Management Report**
- Projects started vs completed
- Pole installation progress  
- Staff productivity metrics
- Material usage and costs
- Upcoming deadlines and bottlenecks

### **Monthly Executive Summary**
- Overall project pipeline health
- Resource allocation efficiency  
- Cost vs budget analysis
- Quality metrics and issues
- Strategic recommendations

## 🚨 **Important Notes:**

- **APIs are READ-ONLY** - Cannot change any data
- **Large datasets** - Initial load may take 2-3 minutes
- **API limits** - Currently no rate limits, but be reasonable
- **Support** - Contact dev team for API issues

## 🔧 **Troubleshooting:**

**"Can't connect to data source"**
- Check internet connection
- Verify API URLs are exact
- Ensure APIs are public (run gcloud commands above)

**"Empty data returned"**
- Database might be empty or API key wrong
- Check API key: `powerbi-data-warehouse-2025` or `powerbi-firebase-warehouse-2025`

**"Takes too long to load"**
- Large datasets take time
- Try connecting to individual collections first
- Use Power Query to filter data

---
*You now have COMPLETE access to both your Neon and Firebase databases through Power BI!*