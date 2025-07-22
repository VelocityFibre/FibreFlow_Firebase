const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

async function checkLiveProjects() {
  console.log('🔍 Checking live FibreFlow projects...\n');
  
  try {
    // Get all projects from live database
    const projectsSnapshot = await db.collection('projects').get();
    
    console.log(`Found ${projectsSnapshot.size} projects in live database:\n`);
    
    const projects = [];
    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: data.name || data.title,
        code: data.code || data.projectCode,
        client: data.client?.name || 'N/A',
        status: data.status,
        location: data.location,
        type: data.type,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });
    
    // Sort by name
    projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Display projects
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name || 'Unnamed Project'}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Code: ${project.code || 'No code'}`);
      console.log(`   Client: ${project.client}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Location: ${project.location || 'N/A'}`);
      console.log(`   Type: ${project.type || 'N/A'}`);
      console.log('---');
    });
    
    // Look for Lawley project specifically
    console.log('\n🔍 Looking for Lawley project...');
    const lawleyProjects = projects.filter(p => 
      p.name?.toLowerCase().includes('lawley') || 
      p.code?.toLowerCase().includes('law') ||
      p.location?.toLowerCase().includes('lawley')
    );
    
    if (lawleyProjects.length > 0) {
      console.log('\n✅ Found Lawley-related projects:');
      lawleyProjects.forEach(p => {
        console.log(`- ${p.name} (ID: ${p.id}, Code: ${p.code})`);
      });
    } else {
      console.log('\n⚠️  No Lawley project found in live database');
      console.log('You may need to create a Lawley project first');
    }
    
    // Check our data
    console.log('\n📊 Our 1Map data info:');
    console.log('- Pole prefix: LAW');
    console.log('- Location: Lawley Estate, Lenasia');
    console.log('- Total poles: 543 ready for sync');
    
  } catch (error) {
    console.error('Error checking projects:', error);
  }
}

checkLiveProjects();