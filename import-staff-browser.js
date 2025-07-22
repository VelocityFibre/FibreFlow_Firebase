
// FibreFlow Staff Import Script
// Run this in the browser console at https://fibreflow-73daf.web.app

async function importStaff() {
  const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
  
  const db = getFirestore();
  const staffCollection = collection(db, 'staff');
  
  const staffData = [
  {
    "employeeId": "VF001",
    "name": "Kylin Musgrave",
    "email": "kylin@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Admin",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF002",
    "name": "Janice George",
    "email": "janice@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Admin",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF003",
    "name": "Lenardt Meyer",
    "email": "lenardt@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF004",
    "name": "Adrian Paulse",
    "email": "adrian@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF005",
    "name": "Marchael Meyer",
    "email": "marchael@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF006",
    "name": "Byron Viviers",
    "email": "byron@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF007",
    "name": "Leonel Felix",
    "email": "leonel@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF008",
    "name": "Wiekus Moolman",
    "email": "wiekus@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF009",
    "name": "Cecelia Serekoeng",
    "email": "cecelia@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF010",
    "name": "Charles Jacques Langenhoven",
    "email": "charles@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF011",
    "name": "Francois Labuschagne",
    "email": "francois@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF012",
    "name": "Adriaan Vorster",
    "email": "adriaan@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF013",
    "name": "Shalom Naidoo",
    "email": "shalom@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF014",
    "name": "Rohan Oiivier",
    "email": "rohan@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF015",
    "name": "Ian Murugan",
    "email": "ian@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF016",
    "name": "Jaun De Wit",
    "email": "jaun@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF017",
    "name": "Novacom (Reynard)",
    "email": "reynard@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF018",
    "name": "Clearpath (Wian)",
    "email": "wian@velocityfibre.rp.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF019",
    "name": "Nojoli (Melanie)",
    "email": "melanie@velocityfibre.li.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Admin",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF020",
    "name": "CPJ Consulting (Carla)",
    "email": "carla@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Admin",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF021",
    "name": "V4 Wayleave (Lester)",
    "email": "lester@velocityfibre.ay.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF022",
    "name": "All Hard Solutions (Gert)",
    "email": "gert@velocityfibre.ha.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF023",
    "name": "Traveller Boards (Louis)",
    "email": "louis@velocityfibre.el.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF024",
    "name": "Blazelink Networks (Jody)",
    "email": "jody@velocityfibre.el.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF025",
    "name": "Baobab Consulting (Hanro)",
    "email": "hanro@velocityfibre.ab.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF026",
    "name": "CB Solutions (Ettiene)",
    "email": "ettiene@velocityfibre.ol.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF027",
    "name": "Brightsphere (Hein)",
    "email": "hein@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Technician",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF028",
    "name": "Integra Trading (Marco)",
    "email": "marco@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "ProjectManager",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  },
  {
    "employeeId": "VF029",
    "name": "Lewhofmeyr (Lew)",
    "email": "lew@velocityfibre.co.za",
    "phone": "+27 00 000 0000",
    "primaryGroup": "Admin",
    "availability": {
      "status": "available",
      "workingHours": {
        "start": "08:00",
        "end": "17:00",
        "timezone": "Africa/Johannesburg"
      },
      "currentTaskCount": 0,
      "maxConcurrentTasks": 5
    },
    "activity": {
      "lastLogin": null,
      "lastActive": null,
      "tasksCompleted": 0,
      "tasksInProgress": 0,
      "tasksFlagged": 0,
      "totalProjectsWorked": 0,
      "averageTaskCompletionTime": 0
    },
    "isActive": true,
    "createdBy": "import-script"
  }
];
  
  console.log('Starting import of ' + staffData.length + ' staff members...');
  
  let imported = 0;
  let skipped = 0;
  
  for (const staff of staffData) {
    try {
      // Check if staff already exists
      const q = query(staffCollection, where('email', '==', staff.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('⚠️ Skipping existing: ' + staff.name);
        skipped++;
        continue;
      }
      
      // Add timestamps
      staff.createdAt = serverTimestamp();
      staff.updatedAt = serverTimestamp();
      
      // Add to Firestore
      await addDoc(staffCollection, staff);
      console.log('✅ Imported: ' + staff.name + ' (' + staff.primaryGroup + ')');
      imported++;
      
    } catch (error) {
      console.error('❌ Error importing ' + staff.name + ':', error);
    }
  }
  
  console.log('\n✅ Import complete!');
  console.log('Imported: ' + imported);
  console.log('Skipped (existing): ' + skipped);
  console.log('\nRefresh the staff page to see the new entries.');
}

// Run the import
importStaff();
