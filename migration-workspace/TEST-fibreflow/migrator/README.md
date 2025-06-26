# Airtable to Firebase Migration Tool

A TypeScript-based CLI tool for migrating data from Airtable to Firebase Firestore.

## Features

- ✅ Batch processing with configurable batch sizes
- ✅ Field mapping and transformation
- ✅ Relationship handling with denormalization options
- ✅ Dry-run mode for testing
- ✅ Progress tracking and error handling
- ✅ Date-based incremental migration
- ✅ Calculated fields support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```env
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=appkYMgaK0cHVu4Zg
```

3. Add your Firebase service account JSON file:
   - Download from Firebase Console > Project Settings > Service Accounts
   - Save as `service-account.json` in the project root

4. Build the project:
```bash
npm run build
```

## Usage

### Migrate all tables
```bash
npm run migrate
```

### Migrate specific tables
```bash
npm run migrate customers projects
```

### Dry run (no Firebase writes)
```bash
npm run migrate -- --dry-run
```

### Incremental migration (modified after date)
```bash
npm run migrate -- --from-date "2025-01-01"
```

### Custom batch size
```bash
npm run migrate -- --batch-size 200
```

### Validate table mapping
```bash
npm run dev validate customers
```

## Table Mappings

Current supported tables:
- ✅ Customers
- 🚧 Projects (partial)
- 🚧 Daily Tracker (partial)
- 🚧 Staff (partial)
- 🚧 Contractors (partial)

## Project Structure

```
src/
├── cli.ts                 # CLI entry point
├── config/
│   └── mappings/         # Table mapping configurations
├── services/
│   ├── airtable.service.ts
│   ├── firebase.service.ts
│   └── transformation.service.ts
├── models/
│   └── types.ts          # TypeScript interfaces
└── utils/                # Helper utilities
```

## Adding New Table Mappings

1. Create a new mapping file in `src/config/mappings/[table-name].mapping.ts`
2. Define field mappings with proper data types and transformations
3. Add the mapping to `src/config/mappings/index.ts`
4. Update the migration order if needed

## Development

```bash
# Run in development mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm test
```

## Troubleshooting

### Connection Issues
- Verify Airtable API key is valid
- Check Firebase service account permissions
- Ensure network connectivity

### Transformation Errors
- Check field mappings match actual Airtable schema
- Verify data types are correct
- Review transformation functions for edge cases

### Performance
- Adjust batch size based on data volume
- Use date filtering for large datasets
- Monitor Firebase quotas

## TODO

- [ ] Complete remaining table mappings
- [ ] Add relationship resolution
- [ ] Implement rollback functionality
- [ ] Add progress persistence for resume capability
- [ ] Create validation suite
- [ ] Add comprehensive error reporting