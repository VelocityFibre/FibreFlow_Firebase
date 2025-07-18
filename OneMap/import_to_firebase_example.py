#!/usr/bin/env python3
"""
Firebase Import Script for Lawley Data
Date: 2025-01-16

This is an EXAMPLE showing how to import the extracted data to Firebase.
Requires firebase-admin Python SDK.

IMPORTANT: This script needs Firebase credentials to run.
"""

import json
import os
from datetime import datetime
from pathlib import Path

# Uncomment these imports when ready to use:
# import firebase_admin
# from firebase_admin import credentials, firestore

def show_import_preview():
    """Show what would be imported without actually doing it"""
    output_dir = Path(__file__).parent / 'output'
    
    # Load the data files
    poles_file = output_dir / 'lawley-poles-extracted.json'
    drops_file = output_dir / 'lawley-drops-extracted.json'
    poles_with_drops_file = output_dir / 'poles-with-drops.json'
    
    print("=== FIREBASE IMPORT PREVIEW ===")
    print(f"Date: {datetime.now().isoformat()}")
    print()
    
    # Check poles data
    if poles_file.exists():
        with open(poles_file, 'r') as f:
            pole_data = json.load(f)
        poles = pole_data['poles']
        print(f"✅ Poles ready to import: {len(poles)}")
        print(f"   - Feeder poles: {sum(1 for p in poles if p['poleType'] == 'feeder')}")
        print(f"   - Distribution poles: {sum(1 for p in poles if p['poleType'] == 'distribution')}")
        print(f"   - All have GPS: {all(p['latitude'] and p['longitude'] for p in poles)}")
    else:
        print("❌ Poles file not found!")
    
    # Check drops data
    if drops_file.exists():
        with open(drops_file, 'r') as f:
            drop_data = json.load(f)
        drops = drop_data['drops']
        print(f"\n✅ Drops ready to import: {len(drops)}")
        print(f"   - Active drops: {sum(1 for d in drops if not d['isSpare'])}")
        print(f"   - Spare drops: {sum(1 for d in drops if d['isSpare'])}")
    else:
        print("\n❌ Drops file not found!")
    
    # Check relationships
    if poles_with_drops_file.exists():
        with open(poles_with_drops_file, 'r') as f:
            relationship_data = json.load(f)
        poles_with_relationships = relationship_data['poles']
        connected_count = sum(1 for p in poles_with_relationships if p['dropCount'] > 0)
        print(f"\n✅ Pole-drop relationships ready: {connected_count} poles have drops")
    
    print("\n=== FIREBASE STRUCTURE ===")
    print("Collections to create:")
    print("1. 'poles' collection")
    print("   └── Each pole as a document with ID = poleId")
    print("2. 'drops' collection")
    print("   └── Each drop as a document with auto-generated ID")
    print("\nOR")
    print("1. 'projects/{projectId}/poles' subcollection")
    print("2. 'projects/{projectId}/drops' subcollection")
    
    print("\n=== IMPORT OPTIONS ===")
    print("Option 1: Direct collections (poles, drops)")
    print("Option 2: Under project (projects/lawley-001/poles, projects/lawley-001/drops)")
    print("Option 3: Import to existing 'planned-poles' and 'drops' collections")
    
    return True

def create_import_script_template():
    """Create a template for actual Firebase import"""
    
    template = '''#!/usr/bin/env python3
"""
Firebase Import Script for Lawley Data
To use this script:
1. Install firebase-admin: pip install firebase-admin
2. Set up service account credentials
3. Update PROJECT_ID and CREDENTIALS_PATH
4. Run the script
"""

import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from pathlib import Path

# CONFIGURATION - UPDATE THESE
PROJECT_ID = 'fibreflow-73daf'
CREDENTIALS_PATH = 'path/to/serviceAccountKey.json'
PROJECT_CODE = 'Law-001'  # Lawley project code

# Initialize Firebase
cred = credentials.Certificate(CREDENTIALS_PATH)
firebase_admin.initialize_app(cred, {
    'projectId': PROJECT_ID
})
db = firestore.client()

def import_poles(batch_size=500):
    """Import poles to Firebase"""
    print("Importing poles...")
    
    # Load pole data
    with open('output/poles-with-drops.json', 'r') as f:
        data = json.load(f)
    poles = data['poles']
    
    # Get or create project reference
    project_ref = db.collection('projects').where('projectCode', '==', PROJECT_CODE).limit(1).get()
    if not project_ref:
        print(f"Project {PROJECT_CODE} not found!")
        return
    
    project_id = project_ref[0].id
    print(f"Found project: {project_id}")
    
    # Batch import poles
    batch = db.batch()
    count = 0
    
    for pole in poles:
        # Create pole document
        pole_ref = db.collection('planned-poles').document()
        pole_data = {
            'id': pole_ref.id,
            'projectId': project_id,
            'poleNumber': pole['poleId'],
            'poleType': pole['poleType'],
            'height': pole['height'],
            'diameter': pole['diameter'],
            'status': pole['status'],
            'location': {
                'latitude': pole['latitude'],
                'longitude': pole['longitude']
            },
            'ponNumber': pole['ponNumber'],
            'zoneNumber': pole['zoneNumber'],
            'connectedDrops': pole['connectedDrops'],
            'dropCount': pole['dropCount'],
            'importedAt': firestore.SERVER_TIMESTAMP,
            'importedBy': 'import-script',
            'createdAt': firestore.SERVER_TIMESTAMP,
            'lastModified': firestore.SERVER_TIMESTAMP
        }
        
        batch.set(pole_ref, pole_data)
        count += 1
        
        # Commit batch when full
        if count % batch_size == 0:
            batch.commit()
            print(f"Imported {count} poles...")
            batch = db.batch()
    
    # Commit remaining
    if count % batch_size != 0:
        batch.commit()
    
    print(f"✅ Imported {count} poles successfully!")
    return count

def import_drops(batch_size=500):
    """Import drops to Firebase"""
    print("\\nImporting drops...")
    
    # Similar implementation for drops
    # ... (code continues)

if __name__ == '__main__':
    print("=== LAWLEY DATA FIREBASE IMPORT ===")
    print(f"Project: {PROJECT_ID}")
    print(f"Project Code: {PROJECT_CODE}")
    
    # Import data
    pole_count = import_poles()
    drop_count = import_drops()
    
    print(f"\\n✅ Import complete!")
    print(f"   - Poles: {pole_count}")
    print(f"   - Drops: {drop_count}")
'''
    
    # Save template
    template_path = Path(__file__).parent / 'firebase_import_template.py'
    with open(template_path, 'w') as f:
        f.write(template)
    
    print(f"\n📄 Firebase import template saved to: {template_path}")
    print("   Edit the configuration section and run when ready.")

if __name__ == '__main__':
    # Show preview of what would be imported
    show_import_preview()
    
    # Create template for actual import
    create_import_script_template()
    
    print("\n=== NEXT STEPS ===")
    print("1. Review the data in output/ directory")
    print("2. Decide on Firebase structure (collections vs subcollections)")
    print("3. Either:")
    print("   a) Use existing import-lawley-drops.js script")
    print("   b) Use the firebase_import_template.py (requires setup)")
    print("   c) Create custom import script")
    print("\n Ready to proceed with Firebase import!")