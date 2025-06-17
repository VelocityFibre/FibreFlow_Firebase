# Deployment Instructions

## Prerequisites
1. Ensure you have Firebase CLI installed
2. Make sure you're logged in to Firebase: `firebase login`

## Build and Deploy
1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## Current Status
The stock form has been enhanced with Material autocomplete functionality:

### What's New:
1. **Material Autocomplete in Stock Form**
   - When adding/editing stock items, you can now search for materials by typing in the Item Code field
   - The autocomplete shows both the material code and description
   - Selecting a material auto-populates: name, description, unit of measure, standard cost, minimum stock, and reorder level
   - A green link icon appears when a stock item is linked to a master material

2. **Stock List Material Integration**
   - Stock items that are linked to master materials show a green link icon
   - Hovering over the icon shows which material it's linked to

### Testing the Integration:
1. Navigate to https://fibreflow-73daf.web.app/materials
2. Create a material (e.g., code: "ldp001", description: "Test Cable")
3. Navigate to https://fibreflow-73daf.web.app/stock
4. Click "Add Item"
5. Start typing "ldp" in the Item Code field
6. You should see the material appear in the autocomplete dropdown
7. Select it to auto-populate the form fields
8. Save the stock item
9. The stock list will show a green link icon next to linked items

### Important Notes:
- Creating a material does NOT automatically create stock - they are separate entities
- Materials are the catalog/template, Stock Items are the actual inventory
- You can create stock items without linking to materials (legacy support)
- The material autocomplete searches as you type with a 300ms debounce