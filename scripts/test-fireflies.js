const fetch = require('node-fetch');

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';
const FIREFLIES_API_KEY = '894886b5-b232-4319-95c7-1296782e9ea6';

async function testFirefliesConnection() {
  console.log('Testing Fireflies API connection...\n');

  const query = `
    query {
      user {
        email
        name
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

    const data = await response.json();
    console.log('\nResponse data:', JSON.stringify(data, null, 2));

    if (data.data && data.data.user) {
      console.log('\n✅ Successfully connected to Fireflies!');
      console.log(`User: ${data.data.user.name} (${data.data.user.email})`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFirefliesConnection();