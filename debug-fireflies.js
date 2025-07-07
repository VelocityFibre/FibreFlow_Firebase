#!/usr/bin/env node

const fetch = require('node-fetch');

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

async function testFirefliesAPI() {
  console.log('Testing Fireflies API connection...');
  
  // Simple query to get recent meetings
  const query = `
    query GetMeetings {
      meetings(limit: 5) {
        id
        title
        date
        duration
      }
    }
  `;

  try {
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIREFLIES_API_KEY}`,
      },
      body: JSON.stringify({ query }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Parsed data:', JSON.stringify(data, null, 2));
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
    }

    return data.data;
  } catch (error) {
    console.error('Error testing API:', error);
    throw error;
  }
}

testFirefliesAPI()
  .then(result => {
    console.log('API test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('API test failed:', error);
    process.exit(1);
  });