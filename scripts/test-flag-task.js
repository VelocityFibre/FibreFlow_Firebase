// Test script to flag a task directly in Firestore
// This will help verify if the issue is with data persistence or dashboard reading

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAsqweywN5uYsQGxYsN7QKITr-UkTHJpLY",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "872674672986",
  appId: "1:872674672986:web:bb7fc33e18bc3cf8abb999"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFlagTask() {
  try {
    console.log('=== TESTING TASK FLAGGING ===\n');
    
    // Get tasks from Ivory Park project
    const projectId = 'kSFwvjb24zn1MgxS3VUU';
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('projectId', '==', projectId));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} tasks in Ivory Park project`);
    
    if (snapshot.size === 0) {
      console.log('No tasks found for this project');
      return;
    }
    
    // Get first task that isn't already flagged
    let taskToFlag = null;
    snapshot.forEach(doc => {
      const task = doc.data();
      if (!taskToFlag && task.priority !== 'high' && task.priority !== 'critical') {
        taskToFlag = { id: doc.id, ...task };
      }
    });
    
    if (!taskToFlag) {
      console.log('All tasks are already flagged!');
      return;
    }
    
    console.log(`\nFlagging task: ${taskToFlag.name}`);
    console.log(`Current priority: ${taskToFlag.priority}`);
    
    // Update task priority to HIGH
    const taskRef = doc(db, 'tasks', taskToFlag.id);
    await updateDoc(taskRef, {
      priority: 'high',
      updatedAt: new Date()
    });
    
    console.log('Task flagged successfully!');
    
    // Verify the update
    const updatedSnapshot = await getDocs(q);
    let flaggedCount = 0;
    updatedSnapshot.forEach(doc => {
      const task = doc.data();
      if (task.priority === 'high' || task.priority === 'critical') {
        flaggedCount++;
      }
    });
    
    console.log(`\nTotal flagged tasks in project: ${flaggedCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFlagTask();