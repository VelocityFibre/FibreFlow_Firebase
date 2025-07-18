#!/usr/bin/env python3
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
    print("\nImporting drops...")
    
    # Similar implementation for drops
    # ... (code continues)

if __name__ == '__main__':
    print("=== LAWLEY DATA FIREBASE IMPORT ===")
    print(f"Project: {PROJECT_ID}")
    print(f"Project Code: {PROJECT_CODE}")
    
    # Import data
    pole_count = import_poles()
    drop_count = import_drops()
    
    print(f"\n✅ Import complete!")
    print(f"   - Poles: {pole_count}")
    print(f"   - Drops: {drop_count}")
