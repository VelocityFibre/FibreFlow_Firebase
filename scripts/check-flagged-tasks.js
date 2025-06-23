const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkFlaggedTasks() {
  try {
    console.log('=== CHECKING FLAGGED TASKS ===\n');
    
    // Get all tasks
    const tasksSnapshot = await db.collection('tasks').get();
    console.log(`Total tasks in database: ${tasksSnapshot.size}`);
    
    // Count by priority
    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      undefined: 0
    };
    
    const flaggedTasks = [];
    const ivoryParkTasks = [];
    
    tasksSnapshot.forEach(doc => {
      const task = { id: doc.id, ...doc.data() };
      
      // Count priorities
      const priority = task.priority || 'undefined';
      if (priorityCounts.hasOwnProperty(priority)) {
        priorityCounts[priority]++;
      } else {
        priorityCounts[priority] = 1;
      }
      
      // Check if flagged (high or critical)
      if (priority === 'high' || priority === 'critical') {
        flaggedTasks.push(task);
      }
      
      // Check if from Ivory Park project
      if (task.projectId === 'kSFwvjb24zn1MgxS3VUU') {
        ivoryParkTasks.push(task);
      }
    });
    
    console.log('\nPriority Distribution:');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count}`);
    });
    
    console.log(`\nTotal flagged tasks (HIGH/CRITICAL): ${flaggedTasks.length}`);
    
    console.log(`\nIvory Park BOQ tasks: ${ivoryParkTasks.length}`);
    const ivoryParkFlagged = ivoryParkTasks.filter(t => 
      t.priority === 'high' || t.priority === 'critical'
    );
    console.log(`Ivory Park flagged tasks: ${ivoryParkFlagged.length}`);
    
    if (ivoryParkFlagged.length > 0) {
      console.log('\nIvory Park flagged task details:');
      ivoryParkFlagged.forEach(task => {
        console.log(`  - ${task.name} (${task.priority})`);
      });
    }
    
    // Check data format issues
    console.log('\n=== DATA FORMAT CHECK ===');
    const tasksWithEnumPriority = tasksSnapshot.docs.filter(doc => {
      const priority = doc.data().priority;
      return priority && typeof priority === 'object';
    });
    console.log(`Tasks with object/enum priority: ${tasksWithEnumPriority.length}`);
    
    const tasksWithStringPriority = tasksSnapshot.docs.filter(doc => {
      const priority = doc.data().priority;
      return priority && typeof priority === 'string';
    });
    console.log(`Tasks with string priority: ${tasksWithStringPriority.length}`);
    
    // Check for any data inconsistencies
    const tasksWithoutPriority = tasksSnapshot.docs.filter(doc => !doc.data().priority);
    console.log(`Tasks without priority: ${tasksWithoutPriority.length}`);
    
    if (tasksWithoutPriority.length > 0) {
      console.log('\nTasks missing priority:');
      tasksWithoutPriority.slice(0, 5).forEach(doc => {
        const task = doc.data();
        console.log(`  - ${task.name || 'Unnamed task'} (ID: ${doc.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking tasks:', error);
  } finally {
    process.exit();
  }
}

checkFlaggedTasks();