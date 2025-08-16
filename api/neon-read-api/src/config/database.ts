import { neon } from '@neondatabase/serverless';
import { functions } from 'firebase-functions';

// Get connection string from environment
const connectionString = process.env.NEON_CONNECTION_STRING || 
                        functions.config().neon?.connection_string;

if (!connectionString) {
  throw new Error('NEON_CONNECTION_STRING not configured');
}

// Create Neon client
export const sql = neon(connectionString);

// Database configuration
export const neonConfig = {
  // Connection pooling settings
  maxConnections: 10,
  idleTimeout: 30000,
  
  // Query timeout
  queryTimeout: 30000,
  
  // Read-only user (enforce at database level)
  readOnly: true
};

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Neon connection successful:', result[0].now);
    return true;
  } catch (error) {
    console.error('Neon connection failed:', error);
    return false;
  }
}