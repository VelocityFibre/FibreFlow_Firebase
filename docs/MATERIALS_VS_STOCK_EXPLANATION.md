
# Master Materials vs Stock Items - System Design

## Overview
The MPMS system uses a two-tier approach to manage materials and inventory:

1. **Master Materials** - The catalog of all possible materials
2. **Stock Items** - The actual inventory on hand

## Master Materials (/materials)
**Purpose**: Material catalog and specifications database

### What it contains:
- **Item Code**: Unique identifier (e.g., "DP-A-1-LB-86/73-2-10")
- **Description**: Full description of the material
- **Specifications**: Technical specifications
- **Category**: Type of material (Drop Cable, ADSS, Pole, etc.)
- **Unit of Measure**: How it's measured (each, meters, feet)
- **Unit Cost**: Standard cost per UoM
- **Minimum Stock Level**: Reorder point
- **Supplier Information**: Preferred supplier

### Use Cases:
- Define new materials before purchasing
- Standardize item codes across the organization
- Set pricing and specifications
- Create material templates for BOQs
- Import material catalogs from suppliers

### Example:
```
Master Material:
- Item Code: FIB-ADSS-48F-G652D
- Description: Aerial Cable ADSS 48 Fiber G.652D
- Category: Feeder Cable - ADSS
- UoM: meters
- Unit Cost: R45.50
- Min Stock: 2000 meters
```

## Stock Items (/stock)
**Purpose**: Track actual inventory quantities and movements

### What it contains:
- **Reference to Master Material** (Item Code)
- **Current Quantity**: Actual stock on hand
- **Allocated Quantity**: Reserved for projects
- **Available Quantity**: Free stock (Current - Allocated)
- **Location/Warehouse**: Where it's stored
- **Batch Numbers**: For tracking
- **Last Movement Date**: Recent activity

### Use Cases:
- Check what's actually in the warehouse
- Track stock movements (in/out)
- Allocate stock to projects
- Monitor stock levels
- Record goods received
- Track usage by project

### Example:
```
Stock Item:
- Item Code: FIB-ADSS-48F-G652D (links to Master)
- Current Quantity: 5,500 meters
- Allocated: 2,000 meters (Project ABC)
- Available: 3,500 meters
- Location: Warehouse A, Rack 15
- Last Movement: Received 1,000m on 2024-01-15
```

## How They Work Together

### 1. Material Creation Flow:
```
Master Materials → Stock Items → Project Allocation
     ↓                ↓               ↓
Define Material   Receive Stock   Allocate to BOQ
```

### 2. BOQ Creation Flow:
```
BOQ Item Selection → Check Master Material → Check Stock Availability
        ↓                    ↓                        ↓
Select from Master    Get specifications      See if in stock
```

### 3. Procurement Flow:
```
Low Stock Alert → Check Master Material → Generate Purchase Order
       ↓                  ↓                      ↓
Stock < Min Level   Get supplier info     Order correct UoM quantity
```

## Key Relationships

1. **One-to-One**: Each Stock Item MUST reference a Master Material
2. **Master First**: You cannot create stock without first defining the material
3. **UoM Consistency**: Stock quantities use the UoM defined in Master
4. **Cost Tracking**: Stock movements use the unit cost from Master

## Practical Examples

### Scenario 1: New Material Purchase
1. Check if material exists in Master Materials
2. If not, create new Master Material with specifications
3. Create Purchase Order referencing the Master Material
4. Receive goods → Stock Item created/updated
5. Stock now available for allocation

### Scenario 2: Creating BOQ
1. Select materials from Master Materials catalog
2. Specify required quantities
3. System checks Stock Items for availability
4. Shows shortage if required > available
5. Generate procurement list for shortages

### Scenario 3: Different Types of Cable
Master Materials:
- FIB-DROP-1F (Drop Cable, 1 fiber, UoM: each)
- FIB-ADSS-48F (ADSS Cable, 48 fiber, UoM: meters)
- FIB-MICRO-12F (Micro blown, 12 fiber, UoM: meters)

Stock Items:
- FIB-DROP-1F: 150 each in stock
- FIB-ADSS-48F: 5,500 meters in stock
- FIB-MICRO-12F: 3,000 meters in stock

## Benefits of This Approach

1. **Data Integrity**: Material specifications defined once, used everywhere
2. **Flexibility**: Can define materials before purchasing
3. **Standardization**: Consistent item codes and descriptions
4. **Better Planning**: Can create BOQs even without stock
5. **Accurate Costing**: Unit costs maintained centrally
6. **Inventory Control**: Clear separation between "what we use" vs "what we have"

## Implementation Status

✅ **Completed**:
- Master Materials module (basic CRUD)
- Stock Items module (existing)

🔄 **In Progress**:
- Linking Stock Items to Master Materials
- UoM-aware stock tracking

⏳ **Planned**:
- Automatic stock creation from Master
- Stock allocation to BOQs
- Low stock alerts based on Master minimums
- Procurement integration
