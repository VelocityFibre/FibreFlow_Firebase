// Script to add development notes to specific pages
// Run this in the browser console while logged in as admin

async function addDevNotes() {
  // Get Firebase instances
  const { getFirestore, doc, updateDoc, addDoc, collection, query, where, getDocs } = window.firebase.firestore;
  const db = getFirestore();

  // Helper function to get or create dev note for a route
  async function getOrCreateNote(route, pageTitle) {
    const q = query(collection(db, 'devNotes'), where('route', '==', route));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    // Create new note
    const newNote = {
      route,
      pageTitle,
      notes: '',
      tasks: [],
      errors: [],
      createdAt: new Date(),
      createdBy: 'admin@fibreflow.com',
      lastUpdated: new Date(),
      updatedBy: 'admin@fibreflow.com'
    };

    const docRef = await addDoc(collection(db, 'devNotes'), newNote);
    return { id: docRef.id, ...newNote };
  }

  // Helper to generate ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 1. Add notes for OneMap settings page
  console.log('Adding notes for OneMap settings...');
  const onemapNote = await getOrCreateNote('/settings/onemap', 'OneMap Settings');
  
  const onemapTasks = [
    {
      id: generateId(),
      text: 'Complete payment verification module implementation',
      status: 'in-progress',
      priority: 'high',
      assignee: 'admin@fibreflow.com',
      createdAt: new Date()
    },
    {
      id: generateId(),
      text: 'Complete NAD ID management CRUD operations',
      status: 'in-progress',
      priority: 'high',
      assignee: 'admin@fibreflow.com',
      createdAt: new Date()
    },
    {
      id: generateId(),
      text: 'Implement form validation for all OneMap forms',
      status: 'todo',
      priority: 'medium',
      assignee: 'admin@fibreflow.com',
      createdAt: new Date()
    },
    {
      id: generateId(),
      text: 'Implement Excel export functionality for OneMap data',
      status: 'todo',
      priority: 'medium',
      assignee: 'admin@fibreflow.com',
      createdAt: new Date()
    }
  ];

  await updateDoc(doc(db, 'devNotes', onemapNote.id), {
    notes: 'OneMap integration in progress. Payment verification module started and NAD ID management CRUD partially implemented. Form validation and Excel export still needed.',
    tasks: onemapTasks,
    lastUpdated: new Date(),
    updatedBy: 'admin@fibreflow.com'
  });

  // 2. Add notes for Meetings page
  console.log('Adding notes for Meetings page...');
  const meetingsNote = await getOrCreateNote('/meetings', 'Meetings');
  
  const meetingsTasks = [
    {
      id: generateId(),
      text: 'Add edit meeting details feature',
      status: 'todo',
      priority: 'medium',
      assignee: 'admin@fibreflow.com',
      createdAt: new Date()
    }
  ];

  await updateDoc(doc(db, 'devNotes', meetingsNote.id), {
    notes: 'Fireflies sync is working properly. Action items display has been fixed and delete functionality has been added. The meeting sync can be run using: node scripts/sync-meetings-simple.js',
    tasks: meetingsTasks,
    lastUpdated: new Date(),
    updatedBy: 'admin@fibreflow.com'
  });

  // 3. Add notes for Dev Panel itself (using admin dashboard as example)
  console.log('Adding notes for Dev Panel feature...');
  const devPanelNote = await getOrCreateNote('/admin', 'Admin Dashboard');
  
  const devPanelTasks = [
    {
      id: generateId(),
      text: 'Consider adding export/import functionality for dev notes',
      status: 'todo',
      priority: 'low',
      assignee: 'admin@fibreflow.com',
      createdAt: new Date()
    }
  ];

  await updateDoc(doc(db, 'devNotes', devPanelNote.id), {
    notes: 'Dev panel successfully implemented with route tracking working with dynamic segments. Theme spacing issues have been resolved. The panel provides a good overview of development tasks and notes for each page.',
    tasks: devPanelTasks,
    lastUpdated: new Date(),
    updatedBy: 'admin@fibreflow.com'
  });

  console.log('✅ All dev notes added successfully!');
  console.log('Navigate to each page to see the notes in the dev panel.');
}

// Run the function
addDevNotes().catch(console.error);