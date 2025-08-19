// Firebase configuration for PolePlantingApp
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Using same Firebase project as FibreFlow
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126",
  measurementId: "G-J0P7YRLGPW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services (basic initialization)
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Enable offline persistence (suppress deprecation warning for now)
enableIndexedDbPersistence(db, { synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not available in this browser');
  }
});

export default app;