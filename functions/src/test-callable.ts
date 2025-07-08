import * as functions from 'firebase-functions';

// Simple test callable function to verify CORS
export const testCallable = functions.https.onCall(async (data, context) => {
  console.log('Test callable function invoked');
  
  return {
    success: true,
    message: 'Callable function is working!',
    timestamp: new Date().toISOString(),
    region: process.env.FUNCTION_REGION || 'us-central1',
    data: data
  };
});