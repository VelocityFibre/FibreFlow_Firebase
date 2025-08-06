import { Environment } from '../app/core/types/environment.types';

export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
    authDomain: "fibreflow-73daf.firebaseapp.com",
    projectId: "fibreflow-73daf",
    storageBucket: "fibreflow-73daf.firebasestorage.app",
    messagingSenderId: "296054249427",
    appId: "1:296054249427:web:2f0d6482daa6beb0624126",
    measurementId: "G-J0P7YRLGPW"
  },
  sentry: {
    dsn: 'https://6cff665ed0e4b1cdba0d84da3585c68f@o4508210707431424.ingest.us.sentry.io/4509515741200384',
    environment: 'production'
  },
  supabaseUrl: 'https://vkmpbprvooxgrkwrkbcf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8'
} satisfies Environment;