# Neon Setup Guide for FibreFlow

## Prerequisites
- Node.js 20.x installed
- Access to FibreFlow codebase
- Neon account created at [neon.tech](https://neon.tech)

## Step 1: Install Required Packages

```bash
# Install Neon serverless driver (recommended for serverless)
npm install @neondatabase/serverless

# Or install standard PostgreSQL client
npm install pg @types/pg

# For connection pooling (if not using Neon's built-in pooler)
npm install pg-pool @types/pg-pool
```

## Step 2: Environment Configuration

The Neon connection string has already been added to:
- `/src/environments/environment.prod.ts`
- `/src/environments/environment.ts` (needs to be updated)

## Step 3: Create Neon Service

```typescript
// src/app/core/services/neon.service.ts
import { Injectable } from '@angular/core';
import { neon } from '@neondatabase/serverless';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NeonService {
  private sql = neon(environment.neonConnectionString!);

  async query<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      const result = await this.sql(query, params);
      return result as T[];
    } catch (error) {
      console.error('Neon query error:', error);
      throw error;
    }
  }
}
```

## Step 4: Test Connection

```bash
# Run the test script
node Neon/scripts/test-connection.js
```

## Step 5: Create Initial Schema

```sql
-- Neon/sql/schema.sql
-- Projects table (synced from Firestore)
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  client_name VARCHAR(255),
  status VARCHAR(50),
  progress DECIMAL(5,2),
  location VARCHAR(500),
  start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily progress table
CREATE TABLE IF NOT EXISTS daily_progress (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) REFERENCES projects(id),
  date DATE NOT NULL,
  poles_installed INTEGER DEFAULT 0,
  drops_connected INTEGER DEFAULT 0,
  issues_reported INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_location ON projects(location);
CREATE INDEX idx_daily_progress_date ON daily_progress(date);
CREATE INDEX idx_daily_progress_project ON daily_progress(project_id);
```

## Step 6: Sync Data from Firestore

The sync script will:
1. Connect to both Firestore and Neon
2. Fetch data from Firestore collections
3. Transform and insert into Neon tables
4. Handle updates and deletes

## Step 7: Verify Setup

```typescript
// Test in component
constructor(private neon: NeonService) {}

async testNeonConnection() {
  try {
    const result = await this.neon.query('SELECT NOW() as current_time');
    console.log('Neon connected:', result[0].current_time);
  } catch (error) {
    console.error('Neon connection failed:', error);
  }
}
```

## Common Issues & Solutions

### SSL Connection Error
- Ensure `sslmode=require` is in connection string
- Check firewall rules if self-hosted

### Connection Timeout
- Using pooler URL? It auto-suspends after inactivity
- First query after suspension takes 1-2 seconds

### Permission Denied
- Check database user has necessary permissions
- Grant permissions: `GRANT ALL ON DATABASE neondb TO neondb_owner;`

## Performance Optimization

1. **Use Prepared Statements**
```typescript
const result = await this.sql(
  'SELECT * FROM projects WHERE status = $1',
  ['active']
);
```

2. **Connection Pooling**
- Already handled by Neon pooler
- URL contains `-pooler` suffix

3. **Batch Operations**
```typescript
// Insert multiple records efficiently
const values = projects.map(p => [p.id, p.title, p.status]);
await this.sql('INSERT INTO projects (id, title, status) VALUES ' +
  values.map((_, i) => `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(','),
  values.flat()
);
```

## Next Steps
1. Create analytics views
2. Set up automated sync job
3. Implement caching strategy
4. Add monitoring/alerting

---

*Last Updated: 2025-01-30*