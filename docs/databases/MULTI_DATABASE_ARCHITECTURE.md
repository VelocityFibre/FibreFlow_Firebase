# FibreFlow Multi-Database Architecture

*Last Updated: 2025-01-30*

## 🗺️ Clear Database Mapping - What Goes Where

### 📊 Multi-Database Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Field App     │         │  OneMap Excel    │         │   SOW Excel      │
│  (GPS + Photos) │         │  (Status Updates)│         │   (Infrastructure│
│                 │         │                  │         │    Planning)     │
└────────┬────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                           │                              │
         │                           └──────────┬───────────────────┘
         │                                      │
         ↓                                      ↓
┌─────────────────┐                   ┌──────────────────┐
│    Firebase     │                   │      Neon        │
│                 │                   │                  │
│ • Photos        │                   │ • SOW Data       │
│ • Real GPS      │                   │ • Status Updates │
│ • Field Work    │                   │ • Analytics      │
│ • Offline Queue │                   │ • Import History │
│ • Quality Checks│                   │ • Capacity Mgmt  │
└────────┬────────┘                   └────────┬─────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        ↓
              ┌─────────────────┐
              │  FibreFlow UI   │
              │ (Reads Both DBs)│
              └─────────────────┘
```

---

## 📋 Data Source Details

### 📱 **Firebase** (Real-time Operations)
**Purpose**: Field operations, photos, real-time updates, offline support

**Stores:**
- Photo uploads (before, after, side, depth, concrete, compaction)
- Real-time GPS coordinates from field
- Offline queue for poor connectivity
- Quality check verifications
- Field technician notes
- Manual admin data entry
- User authentication & profiles

**Collections:**
- `pole-installations`
- `planned-poles`
- `users`
- `projects`
- `contractors`

### 📊 **Neon PostgreSQL** (Analytics & Imports)
**Purpose**: Excel imports, status tracking, reporting, analytics

**Stores:**
- SOW Excel data (planned infrastructure)
- OneMap Excel status updates
- Status change history
- Analytics aggregations
- Capacity management
- Import batch tracking

**Tables:**
- `sow_poles` (4,471 records)
- `sow_drops` (23,707 records)
- `onemap_status_changes`
- `status_history`
- `import_batches`

---

## 🚫 No Duplication Policy

| Data Type | Firebase | Neon | Notes |
|-----------|----------|------|-------|
| Photos | ✅ | ❌ | Firebase Storage only |
| Field GPS | ✅ | ❌ | Real coordinates |
| Planned GPS | ❌ | ✅ | From SOW Excel |
| Status | ❌ | ✅ | Neon is source of truth |
| Quality Checks | ✅ | ❌ | Field verifications |
| User Data | ✅ | ❌ | Auth stays in Firebase |
| Analytics | ❌ | ✅ | Aggregated in Neon |

---

## 💡 How FibreFlow UI Integrates Both

```typescript
// Unified view combining both databases
interface UnifiedPoleView {
  // From Neon
  status: string;           // Latest from OneMap
  plannedLocation: string;  // From SOW
  plannedCapacity: number;  // From SOW
  
  // From Firebase
  photos: PhotoSet;         // Field captures
  actualGPS: Coordinates;   // Real location
  qualityChecked: boolean;  // Field verification
  
  // Computed
  hasDiscrepancy: boolean;  // Planned vs Actual
  dataCompleteness: number; // % complete
}
```

---

## 🔄 Data Flow Rules

### Firebase → Neon Sync
- **What**: Only metadata (pole ID, project ID)
- **When**: Every 15 minutes
- **Why**: For analytics aggregation
- **NOT**: Photos, GPS, field notes

### Neon → Firebase
- **Never**: Neon data never syncs to Firebase
- **UI reads directly from Neon for status/analytics**

---

## ✅ Benefits of This Architecture

1. **No Confusion** - Each database has a clear purpose
2. **No Duplication** - Each piece of data lives in one place
3. **Best Tool for Job** - Firebase for real-time, Neon for analytics
4. **Simple Mental Model** - Field stuff → Firebase, Imports → Neon
5. **Performance** - Photos stay in Firebase Storage, analytics in Neon

---

## 🎯 Simple Rules to Remember

### When to use Firebase:
- 📸 Anything with photos
- 📍 Real-time GPS tracking
- 📱 Mobile offline data
- ✍️ Manual data entry
- 👥 User management

### When to use Neon:
- 📊 Excel imports (SOW, OneMap)
- 📈 Analytics queries
- 🔄 Status tracking
- 📋 Reports
- 🗓️ Historical data

### When to read from both:
- Pole detail pages
- Project dashboards  
- Search results
- Map views

This architecture gives you the best of both worlds - Firebase's excellent offline/real-time capabilities for field operations, and Neon's powerful analytics for business intelligence, without any data duplication or confusion.