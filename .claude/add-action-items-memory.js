require('dotenv').config({ path: '.env' });
const { ZepClient } = require('@getzep/zep-cloud');

async function addActionItemsDebugMemory() {
  console.log('=== Adding Action Items Debug Memory to Zep ===\n');
  
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const userId = 'fibreflow_dev';
  const projectId = 'fibreflow';
  
  const episodeData = {
    problem: "User reported 'Action Items Management' heading misaligned. Wasted 4 hours editing wrong component (action-items-list) when user was viewing action-items-grid. The clue was there - user mentioned 'Double-click cells to edit' which only appears in grid view!",
    solution: "Simply wrapped content in standard ff-page-container wrapper in action-items-grid component. The /action-items URL loads GRID view by default, not list view.",
    lesson: "ALWAYS verify which component user is actually viewing by: 1) Looking for unique text on their screen, 2) Using grep to find that text, 3) Asking 'Are you seeing a grid/table or a list?' Don't assume from URLs - check actual content! Could have been fixed in 4 minutes instead of 4 hours.",
    pattern: "All FibreFlow pages must use standard ff-page-container wrapper for consistent alignment. When users report layout issues, first check if page is missing this wrapper.",
    metadata: {
      importance: "critical",
      category: "debugging",
      time_wasted: "4 hours",
      actual_fix_time: "4 minutes"
    }
  };
  
  const sessionId = `${projectId}_episode_${Date.now()}`;
  
  try {
    // Create session for this episode
    await zep.memory.addSession({
      sessionId: sessionId,
      userId: userId,
      metadata: {
        type: 'episode',
        episode_title: "Action Items Grid vs List Debugging Nightmare",
        importance: "critical"
      }
    });
    
    console.log(`✅ Created session: ${sessionId}`);
    
    // Add memory to session
    await zep.memory.add(sessionId, {
      messages: [{
        roleType: 'system',
        content: JSON.stringify(episodeData, null, 2),
        metadata: {
          type: 'episode',
          title: "Action Items Grid vs List Debugging Nightmare",
          timestamp: new Date().toISOString(),
          ...episodeData.metadata
        }
      }]
    });
    
    console.log('✅ Successfully added episode to Zep memory!');
    console.log('\n📝 Episode Summary:');
    console.log('- Problem: Edited wrong component for 4 hours');
    console.log('- Solution: Simple ff-page-container wrapper');
    console.log('- Lesson: Always verify actual component being viewed');
    
    // Also add as a pattern
    const patternSessionId = `${projectId}_patterns`;
    
    try {
      await zep.memory.getSession({ sessionId: patternSessionId });
    } catch (e) {
      if (e.message.includes('not found') || e.status === 404) {
        await zep.memory.addSession({
          sessionId: patternSessionId,
          userId: userId,
          metadata: { type: 'patterns' }
        });
      }
    }
    
    await zep.memory.add(patternSessionId, {
      messages: [{
        roleType: 'system',
        content: `Pattern: Debug Component Verification\n${episodeData.lesson}`,
        metadata: {
          type: 'pattern',
          pattern_name: 'debug-component-verification',
          timestamp: new Date().toISOString()
        }
      }]
    });
    
    console.log('✅ Also added as a debugging pattern!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

addActionItemsDebugMemory();