# FibreFlow Storage Integration for OneMap

## Quick Summary

Instead of complex cross-project authentication, we use FibreFlow's storage as the upload point and read from it using VF OneMap scripts.

## How It Works

1. **Janice uploads to FibreFlow** (she's already authenticated there)
2. **Files go to**: `gs://fibreflow-73daf.firebasestorage.app/csv-uploads/`
3. **VF OneMap scripts read directly** from FibreFlow storage
4. **Import to VF OneMap database** with all processing

## Benefits

✅ No authentication issues for Janice  
✅ Same speed as direct upload  
✅ No file copying needed  
✅ Uses existing FibreFlow infrastructure  
✅ Service account handles permissions  

## Commands

```bash
# Test access to FibreFlow storage
node scripts/test-fibreflow-storage-access.js

# Import from FibreFlow to VF OneMap
node scripts/import-from-fibreflow-storage.js

# Process imported data
node scripts/process-pole-permissions.js
```

## Upload URL for Janice

https://fibreflow-73daf.web.app/analytics/pole-permissions/upload

That's it! Simple, fast, and it works with existing authentication.