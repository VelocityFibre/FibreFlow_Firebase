import { TransformationService } from './services/transformation.service';
import { customersMapping } from './config/mappings/customers.mapping';
import chalk from 'chalk';

// Sample Airtable data
const sampleCustomers = [
  {
    id: 'recHz7SGDYFSR88TJ',
    fields: {
      'Client Name': 'fibertime™',
      'Client Type': 'FNO',
      'Contact Information': '1st Floor Oude Bank Building\n14 Spruit Street\nJohannesburg\n2001\ninfo@fibertime.co.za',
      'SLA Terms': 'Standard FNO SLA - 24/7 support, 4 hour response time',
      'Total Projects': 5,
      'Active Projects': 2,
      'Assigned Projects': ['recl5MdhdskBqMtJc', 'rec8116cdd76088af']
    },
    createdTime: '2025-05-19T13:07:08.000Z'
  },
  {
    id: 'recABC123456789',
    fields: {
      'Client Name': 'City of Example',
      'Client Type': 'Municipality',
      'Contact Information': 'Municipal Building\n123 Main Street\nExample City\n0001',
      'SLA Terms': 'Government SLA - Business hours support',
      'Total Projects': 3,
      'Active Projects': 1
    },
    createdTime: '2025-06-01T10:00:00.000Z'
  }
];

async function testTransformation() {
  console.log(chalk.blue('\n🧪 Testing Airtable to Firebase Transformation\n'));
  
  const transformer = new TransformationService();
  
  console.log(chalk.yellow('Original Airtable Record:'));
  console.log(JSON.stringify(sampleCustomers[0], null, 2));
  
  console.log(chalk.blue('\n--- Transforming ---\n'));
  
  const transformed = await transformer.transformRecord(sampleCustomers[0], customersMapping);
  
  console.log(chalk.green('Transformed Firebase Document:'));
  console.log(JSON.stringify(transformed, null, 2));
  
  console.log(chalk.blue('\n📋 What happened:'));
  console.log('1. Client Type: "FNO" → "fno" (lowercase)');
  console.log('2. Contact Info: Multiline text → Structured object');
  console.log('3. Added: airtableId, createdAt, updatedAt fields');
  console.log('4. Nested: stats.totalProjects, stats.activeProjects');
  console.log('\nThis is what will be saved to Firebase! ✅');
}

testTransformation().catch(console.error);