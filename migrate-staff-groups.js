const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'fibreflow-73daf',
});

const db = admin.firestore();

// Mapping from old groups to new groups
const groupMapping = {
  'Admin': 'Management',
  'ProjectManager': 'Project Manager', 
  'Technician': 'Senior Technician', // Default mapping, we'll be smarter below
  'Supplier': 'Management', // Map to Management for now
  'Client': 'Management'     // Map to Management for now
};

// Smart mapping based on job titles/names
function mapToNewGroup(oldGroup, staffName, jobTitle) {
  // If already using new group names, return as-is
  const newGroups = ['Management', 'Regional Project Manager', 'Project Manager', 'Site Supervisor', 'Senior Technician', 'Assistant Technician', 'Planner'];
  if (newGroups.includes(oldGroup)) {
    return oldGroup;
  }
  
  const name = (staffName || '').toLowerCase();
  const title = (jobTitle || '').toLowerCase();
  
  // Smart mapping based on role
  if (oldGroup === 'Admin' || title.includes('admin') || title.includes('director') || title.includes('chief') || title.includes('gm') || title.includes('bookkeeper')) {
    return 'Management';
  }
  
  if (oldGroup === 'ProjectManager' || title.includes('project manager') || title.includes('pm') || title.includes('head of')) {
    // Check for regional PM
    if (title.includes('regional')) {
      return 'Regional Project Manager';
    }
    return 'Project Manager';
  }
  
  if (oldGroup === 'Technician') {
    // Smart mapping for technicians
    if (title.includes('assistant') || title.includes('junior')) {
      return 'Assistant Technician';
    }
    if (title.includes('senior') || title.includes('lead')) {
      return 'Senior Technician';
    }
    if (title.includes('supervisor') || title.includes('site manager')) {
      return 'Site Supervisor';
    }
    if (title.includes('planner') || title.includes('planning')) {
      return 'Planner';
    }
    // Default for technicians
    return 'Senior Technician';
  }
  
  // Default mapping
  return groupMapping[oldGroup] || 'Management';
}

async function migrateStaffGroups() {
  try {
    console.log('🚀 Starting staff group migration...\n');
    
    // Get all staff members
    const staffSnapshot = await db.collection('staff').get();
    
    if (staffSnapshot.empty) {
      console.log('No staff members found to migrate.');
      return;
    }
    
    console.log(`📋 Found ${staffSnapshot.size} staff members to check\n`);
    
    const batch = db.batch();
    let updateCount = 0;
    let alreadyUpdatedCount = 0;
    
    staffSnapshot.forEach(doc => {
      const staff = doc.data();
      const currentGroup = staff.primaryGroup;
      const newGroup = mapToNewGroup(currentGroup, staff.name, staff.skills?.[0] || '');
      
      if (currentGroup !== newGroup) {
        console.log(`📝 Updating: ${staff.name}`);
        console.log(`   Old Group: ${currentGroup}`);
        console.log(`   New Group: ${newGroup}\n`);
        
        batch.update(doc.ref, {
          primaryGroup: newGroup,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
      } else {
        console.log(`✅ Already correct: ${staff.name} (${currentGroup})`);
        alreadyUpdatedCount++;
      }
    });
    
    if (updateCount > 0) {
      console.log(`\n📤 Committing ${updateCount} updates...`);
      await batch.commit();
      console.log('✅ Batch committed successfully!\n');
    }
    
    // Summary
    console.log('📊 Migration Summary:');
    console.log('====================');
    console.log(`✅ Updated: ${updateCount} staff members`);
    console.log(`👍 Already correct: ${alreadyUpdatedCount} staff members`);
    console.log(`📋 Total processed: ${staffSnapshot.size}`);
    
    console.log('\n✨ Migration complete!');
    console.log('🌐 Refresh the staff page to see the updated groups\n');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

// Run migration
migrateStaffGroups();