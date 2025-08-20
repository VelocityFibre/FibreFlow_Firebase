# PowerBI Quick Reference - OneMap to Neon Database

## For Lew - PowerBI Data Source Guide

### 🗄️ Database Connection (VERIFIED)
- **Type**: PostgreSQL (Neon)
- **Server**: ep-long-breeze-a9w7xool.gwc.azure.neon.tech
- **Database**: neondb
- **Main Table**: `status_changes` (30 columns)
- **History Table**: `status_history`

### 📊 Essential Field Mappings

| What You're Looking For | Excel Column Name | Neon Database Column | Table |
|------------------------|-------------------|---------------------|--------|
| Property Identifier | Property ID | `property_id` | status_changes |
| Pole Reference | Pole Number | `pole_number` | status_changes |
| Drop Reference | Drop Number | `drop_number` | status_changes |
| Current Status | Status | `status` | status_changes |
| Street Address | Location Address | `address` | status_changes |
| Area/Zone | Zone | `zone` | status_changes |
| Fiber Network ID | PON/PONs | `pon` | status_changes |
| Sales Agent | Agent Name | `agent_name` | status_changes |
| GPS Coordinates | Latitude/Longitude | `latitude`/`longitude` | status_changes |
| Dates | Various | `date`, `permission_date`, `signup_date` | status_changes |

### 🎯 Common PowerBI Queries

#### 1. Get Latest Status for All Properties
```sql
SELECT * FROM status_changes
WHERE created_at = (
    SELECT MAX(created_at) 
    FROM status_changes sc2 
    WHERE sc2.property_id = status_changes.property_id
)
```

#### 2. Count Properties by Status
```sql
SELECT status, COUNT(*) as count
FROM status_changes
GROUP BY status
ORDER BY count DESC
```

#### 3. Properties with Pole Permissions Approved
```sql
SELECT * FROM status_changes
WHERE status = 'Pole Permission: Approved'
```

#### 4. Track Status Changes Over Time
```sql
SELECT 
    property_id,
    old_status,
    new_status,
    changed_at,
    DATE(changed_at) as change_date
FROM status_history
ORDER BY changed_at DESC
```

### 📈 PowerBI Best Practices

1. **Primary Key**: Always use `property_id` as your unique identifier
2. **Date Filtering**: Use `created_at` for import dates, `date` for business dates
3. **Status Values**: Create a measure to group similar statuses
4. **Relationships**: Link `property_id` between tables

### 🔍 Status Categories for Grouping

```
Home Sign-ups:
- 'Home Sign Ups: Approved & Installation Scheduled'
- 'Home Sign Ups: Declined'
- 'Home Sign Ups: Requested'

Pole Permissions:
- 'Pole Permission: Approved'
- 'Pole Permission: Applied'
- 'Pole Permission: Rejected'

Installations:
- 'Home Installation: Installed'
- 'Home Installation: In Progress'
- 'Home Installation: To Invoice'
```

### 💡 PowerBI Tips

1. **Import Mode**: Use Import mode for better performance
2. **Refresh Schedule**: Daily refresh recommended (new imports daily)
3. **Date Table**: Create a calendar table for time intelligence
4. **Measures**: Create measures for:
   - Total Properties
   - Conversion Rate (Approved/Total)
   - Installation Progress %
   - Average Days to Install

### 📅 Data Refresh Info
- **New Data**: Imported daily from OneMap Excel exports
- **Import Time**: Usually morning (check import_batches table)
- **Data Lag**: 1 day (today's Excel = yesterday's field data)

### ⚠️ Important Notes
1. `property_id` is stored as TEXT (not number)
2. Some properties may have NULL pole_number
3. Status values are case-sensitive
4. GPS coordinates may be 0 for older records

---

*Last Updated: August 20, 2025*
*For questions about the data model, contact the FibreFlow team*