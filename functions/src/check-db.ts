import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const checkDatabase = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('meetings').get();
    
    const meetings: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      meetings.push({
        id: doc.id,
        title: data.title || 'Untitled',
        dateTime: data.dateTime,
        firefliesId: data.firefliesId,
        participants: data.participants?.length || 0,
        actionItems: data.actionItems?.length || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    
    // Sort by date
    meetings.sort((a, b) => {
      const dateA = new Date(a.dateTime || 0).getTime();
      const dateB = new Date(b.dateTime || 0).getTime();
      return dateB - dateA;
    });
    
    res.json({
      success: true,
      totalMeetings: snapshot.size,
      meetings: meetings,
      message: snapshot.size === 0 ? 'No meetings in database' : `Found ${snapshot.size} meetings`
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});