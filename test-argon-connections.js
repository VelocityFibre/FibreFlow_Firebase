// Test script to verify Argon connections
// Run this in the browser console at https://fibreflow-73daf.web.app/argon

async function testArgonConnections() {
  console.log('🔍 Testing Argon AI Assistant Connections...\n');
  
  try {
    // Check if we're on the Argon page
    const isArgonPage = window.location.pathname.includes('argon');
    console.log(`✅ On Argon page: ${isArgonPage}`);
    
    // Look for Angular component
    const argonElement = document.querySelector('app-argon-dashboard');
    if (argonElement) {
      console.log('✅ Argon dashboard component found');
      
      // Check for connection status elements
      const connectionCards = document.querySelectorAll('.connection-card');
      console.log(`\n📊 Database Connections Found: ${connectionCards.length}`);
      
      connectionCards.forEach((card, index) => {
        const name = card.querySelector('h4')?.textContent || 'Unknown';
        const status = card.querySelector('.status-chip')?.textContent || 'Unknown';
        const description = card.querySelector('p')?.textContent || 'No description';
        
        console.log(`\n🔌 Connection ${index + 1}:`);
        console.log(`   Name: ${name}`);
        console.log(`   Status: ${status}`);
        console.log(`   Description: ${description}`);
        
        // Check for Supabase
        if (name.toLowerCase().includes('supabase')) {
          console.error('   ❌ ERROR: Supabase connection still present!');
        } else {
          console.log('   ✅ No Supabase reference found');
        }
      });
      
      // Check chat interface
      const chatInput = document.querySelector('input[formcontrolname="message"]');
      if (chatInput) {
        console.log('\n✅ AI Chat interface found');
        console.log('   You can test queries like:');
        console.log('   - "How many projects are active?"');
        console.log('   - "Show me recent tasks"');
        console.log('   - "What is the system status?"');
      }
      
      // Check for error messages
      const errorCard = document.querySelector('.error-card');
      if (errorCard) {
        const errorText = errorCard.textContent;
        console.error(`\n❌ Error found: ${errorText}`);
      } else {
        console.log('\n✅ No error messages displayed');
      }
      
    } else {
      console.error('❌ Argon dashboard component not found');
      console.log('   Make sure you are logged in and on the /argon page');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testArgonConnections();