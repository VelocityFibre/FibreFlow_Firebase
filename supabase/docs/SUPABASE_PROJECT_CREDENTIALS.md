# Supabase Project Credentials - 1Map Data

**Created**: 2025-08-06  
**Project Name**: 1Map Data  
**Organization**: VFFree  
**Region**: West EU (Ireland)  
**Status**: ✅ Active

## Project Connection Details

### Project URL
```
https://vkmpbprvooxgrkwrkbcf.supabase.co
```

### API Keys

#### Anon Key (Public - Safe for Browser)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8
```

**Note**: This key is safe to use in browser if Row Level Security (RLS) is enabled.

#### Service Role Key (Private - Server Only)
⚠️ **NEVER expose this in client-side code!**
```
Check in Supabase Dashboard > Settings > API > Service Role Key
```

## Quick Setup

### 1. Update Environment File
Add to `/src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  // ... existing config
  supabaseUrl: 'https://vkmpbprvooxgrkwrkbcf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8'
};
```

### 2. Update Production Environment
Add to `/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  // ... existing config
  supabaseUrl: 'https://vkmpbprvooxgrkwrkbcf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8'
};
```

### 3. Initialize Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vkmpbprvooxgrkwrkbcf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8'
const supabase = createClient(supabaseUrl, supabaseKey)
```

## Database Connection

### Connection String (for direct SQL access)
Get from: Dashboard > Settings > Database

Format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.vkmpbprvooxgrkwrkbcf.supabase.co:5432/postgres
```

### Connection Pooling
For serverless/edge functions:
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

## Dashboard Links

- **Project Dashboard**: https://supabase.com/dashboard/project/vkmpbprvooxgrkwrkbcf
- **Table Editor**: https://supabase.com/dashboard/project/vkmpbprvooxgrkwrkbcf/editor
- **SQL Editor**: https://supabase.com/dashboard/project/vkmpbprvooxgrkwrkbcf/sql
- **API Docs**: https://supabase.com/dashboard/project/vkmpbprvooxgrkwrkbcf/api

## Security Reminders

1. **Enable RLS** on all tables before going to production
2. **Use anon key** for client-side code only
3. **Store service key** in server environment variables only
4. **Set up policies** for data access control
5. **Regular backups** via Dashboard > Backups

## Next Steps

1. ✅ Install Supabase client: `npm install @supabase/supabase-js`
2. ✅ Update environment files with credentials
3. ⏳ Create database schema (run SQL from `/supabase/sql/`)
4. ⏳ Import OneMap data
5. ⏳ Test Progress Summary page