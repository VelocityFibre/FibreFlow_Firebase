require('dotenv').config();
const fetch = require('node-fetch');

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const BASE_ID = 'appkYMgaK0cHVu4Zg';

async function testConnection() {
  console.log('Testing Airtable connection...');
  
  // First, let's get the base schema to see all tables
  const schemaUrl = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
  
  try {
    const response = await fetch(schemaUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('\nFound tables in Velocity Fibre Management:');
    console.log('==========================================');
    
    data.tables.forEach(table => {
      console.log(`\nTable: ${table.name} (${table.id})`);
      console.log('Fields:');
      table.fields.forEach(field => {
        console.log(`  - ${field.name} (${field.type})`);
      });
    });

  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();