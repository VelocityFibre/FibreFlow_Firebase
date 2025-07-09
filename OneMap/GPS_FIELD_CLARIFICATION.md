# GPS Field Clarification for OneMap Analysis

## Important: Which GPS Fields to Use

### ✅ CORRECT Fields to Use:
- **Latitude** - The actual pole location latitude
- **Longitude** - The actual pole location longitude

### ❌ IGNORE These Fields:
- **Actual Device Location (Latitude)** - Device GPS, can be inaccurate
- **Actual Device Location (Longitude)** - Device GPS, can be inaccurate
- **Pole Permissions - Actual Device Location (Latitude)**
- **Pole Permissions - Actual Device Location (Longitude)**
- **Home Sign Ups - Actual Device Location (Latitude)**
- **Home Sign Ups - Actual Device Location (Longitude)**
- **Home Installations - Actual Device Location (Latitude)**
- **Home Installations - Actual Device Location (Longitude)**
- **Sales - Actual Device Location (Latitude)**
- **Sales - Actual Device Location (Longitude)**
- **Awareness - Actual Device Location (Latitude)**
- **Awareness - Actual Device Location (Longitude)**

## Why This Matters:
- Device location fields capture where the agent's phone/tablet was
- Can be inaccurate due to poor GPS signal, indoor locations, etc.
- The "Latitude" and "Longitude" fields represent the actual pole location
- These are the coordinates that should be used for all analysis

## Verification:
Our analysis correctly uses the "Latitude" and "Longitude" fields, NOT the device location fields.