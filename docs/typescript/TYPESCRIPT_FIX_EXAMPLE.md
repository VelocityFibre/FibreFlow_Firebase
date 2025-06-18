# TypeScript Fix Example: Stock Service

## Issue
The stock service uses `as any` casts for enum values when importing items.

## Location
`src/app/features/stock/services/stock.service.ts` lines 475 and 477

## Current Code (Bad)
```typescript
const newItem: StockItem = {
  // ...
  category: item.category as any,  // ❌ Using 'as any'
  // ...
  unitOfMeasure: item.unitOfMeasure as any,  // ❌ Using 'as any'
  // ...
};
```

## Root Cause
The imported CSV/Excel data has string values that need to be validated and converted to the proper enum types.

## Solution

### Option 1: Type Guards (Recommended)
```typescript
// Add helper functions at the top of the service
private isValidStockCategory(value: string): value is StockCategory {
  return Object.values(StockCategory).includes(value as StockCategory);
}

private isValidUnitOfMeasure(value: string): value is UnitOfMeasure {
  return Object.values(UnitOfMeasure).includes(value as UnitOfMeasure);
}

// Update the import logic
const newItem: StockItem = {
  // ...
  category: this.isValidStockCategory(item.category) 
    ? item.category 
    : StockCategory.OTHER,
  // ...
  unitOfMeasure: this.isValidUnitOfMeasure(item.unitOfMeasure) 
    ? item.unitOfMeasure 
    : UnitOfMeasure.UNITS,
  // ...
};
```

### Option 2: Mapping Functions
```typescript
// Add mapping functions
private mapToStockCategory(value: string): StockCategory {
  const normalizedValue = value.toLowerCase().replace(/\s+/g, '_');
  
  const categoryMap: Record<string, StockCategory> = {
    'fibre_cable': StockCategory.FIBRE_CABLE,
    'fibre cable': StockCategory.FIBRE_CABLE,
    'cable': StockCategory.FIBRE_CABLE,
    'poles': StockCategory.POLES,
    'equipment': StockCategory.EQUIPMENT,
    'tools': StockCategory.TOOLS,
    'consumables': StockCategory.CONSUMABLES,
    'home_connections': StockCategory.HOME_CONNECTIONS,
    'home connections': StockCategory.HOME_CONNECTIONS,
    'network_equipment': StockCategory.NETWORK_EQUIPMENT,
    'network equipment': StockCategory.NETWORK_EQUIPMENT,
    'safety_equipment': StockCategory.SAFETY_EQUIPMENT,
    'safety equipment': StockCategory.SAFETY_EQUIPMENT,
  };
  
  return categoryMap[normalizedValue] || StockCategory.OTHER;
}

private mapToUnitOfMeasure(value: string): UnitOfMeasure {
  const normalizedValue = value.toLowerCase();
  
  const unitMap: Record<string, UnitOfMeasure> = {
    'meters': UnitOfMeasure.METERS,
    'm': UnitOfMeasure.METERS,
    'units': UnitOfMeasure.UNITS,
    'unit': UnitOfMeasure.UNITS,
    'pieces': UnitOfMeasure.PIECES,
    'piece': UnitOfMeasure.PIECES,
    'boxes': UnitOfMeasure.BOXES,
    'box': UnitOfMeasure.BOXES,
    'rolls': UnitOfMeasure.ROLLS,
    'roll': UnitOfMeasure.ROLLS,
    'sets': UnitOfMeasure.SETS,
    'set': UnitOfMeasure.SETS,
    'liters': UnitOfMeasure.LITERS,
    'l': UnitOfMeasure.LITERS,
    'kilograms': UnitOfMeasure.KILOGRAMS,
    'kg': UnitOfMeasure.KILOGRAMS,
    'hours': UnitOfMeasure.HOURS,
    'hr': UnitOfMeasure.HOURS,
  };
  
  return unitMap[normalizedValue] || UnitOfMeasure.UNITS;
}

// Use in import
const newItem: StockItem = {
  // ...
  category: this.mapToStockCategory(item.category),
  // ...
  unitOfMeasure: this.mapToUnitOfMeasure(item.unitOfMeasure),
  // ...
};
```

### Option 3: Import Validation (Best Practice)
```typescript
// Create an import item interface
interface ImportedStockItem {
  itemCode: string;
  name: string;
  description?: string;
  category: string;  // Raw string from import
  subcategory?: string;
  unitOfMeasure: string;  // Raw string from import
  currentStock?: number;
  minimumStock?: number;
  reorderLevel?: number;
  standardCost?: number;
  warehouseLocation?: string;
}

// Add validation method
private validateAndTransformImportItem(item: ImportedStockItem): StockItem | null {
  // Validate required fields
  if (!item.itemCode || !item.name) {
    console.error('Invalid import item: missing required fields', item);
    return null;
  }
  
  // Transform and validate enums
  const category = this.mapToStockCategory(item.category);
  const unitOfMeasure = this.mapToUnitOfMeasure(item.unitOfMeasure);
  
  const user = this.auth.currentUser;
  
  return {
    itemCode: item.itemCode,
    name: item.name,
    description: item.description || '',
    category,
    subcategory: item.subcategory,
    unitOfMeasure,
    currentStock: item.currentStock || 0,
    allocatedStock: 0,
    minimumStock: item.minimumStock || 0,
    reorderLevel: item.reorderLevel || item.minimumStock || 0,
    standardCost: item.standardCost || 0,
    warehouseLocation: item.warehouseLocation,
    batchTracking: false,
    expiryTracking: false,
    status: StockItemStatus.ACTIVE,
    isProjectSpecific: false,
    createdAt: serverTimestamp() as Timestamp,
    createdBy: user?.uid || 'system',
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: user?.uid || 'system',
  };
}

// Use in import process
const validatedItem = this.validateAndTransformImportItem(item);
if (validatedItem) {
  batch.push(validatedItem);
}
```

## Benefits
1. **Type Safety**: No more `any` types
2. **Runtime Validation**: Catches invalid data during import
3. **Better Error Handling**: Can report specific validation errors
4. **Flexible Mapping**: Handles various input formats
5. **Maintainable**: Easy to add new mappings

## Testing
```typescript
// Add unit tests
describe('StockService Import Validation', () => {
  it('should map valid category strings to enums', () => {
    expect(service.mapToStockCategory('fibre cable')).toBe(StockCategory.FIBRE_CABLE);
    expect(service.mapToStockCategory('POLES')).toBe(StockCategory.POLES);
    expect(service.mapToStockCategory('unknown')).toBe(StockCategory.OTHER);
  });
  
  it('should map valid unit strings to enums', () => {
    expect(service.mapToUnitOfMeasure('meters')).toBe(UnitOfMeasure.METERS);
    expect(service.mapToUnitOfMeasure('kg')).toBe(UnitOfMeasure.KILOGRAMS);
    expect(service.mapToUnitOfMeasure('invalid')).toBe(UnitOfMeasure.UNITS);
  });
});
```

This example demonstrates how to properly handle enum conversions without using `any` types, providing type safety and runtime validation.