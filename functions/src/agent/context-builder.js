const admin = require('firebase-admin');
const db = admin.firestore();

class ContextBuilder {
  constructor(memoryService) {
    this.memoryService = memoryService;
  }

  async buildContext(message, intent, sessionId) {
    const context = {
      intent: intent,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      recentConversations: [],
      projectData: null,
      relevantPatterns: []
    };

    try {
      // Get recent conversations for continuity
      context.recentConversations = await this.memoryService.getRecentConversations(sessionId, 5);
      
      // Get relevant patterns
      context.relevantPatterns = await this.memoryService.searchPatterns(message);
      
      // If project code is detected, fetch project data
      if (intent.entities?.projectCode) {
        context.projectData = await this.fetchProjectContext(intent.entities.projectCode);
      }
      
      // Build enhanced system prompt
      context.systemPrompt = this.buildSystemPrompt(context);
      
    } catch (error) {
      console.error('Error building context:', error);
    }

    return context;
  }

  async fetchProjectContext(projectCode) {
    try {
      // Check cache first
      const cached = await this.memoryService.getCachedContext(projectCode);
      if (cached) {
        console.log(`Using cached context for ${projectCode}`);
        return cached;
      }

      console.log(`Fetching fresh context for ${projectCode}`);
      
      // Fetch project data
      const projectSnapshot = await db.collection('projects')
        .where('projectCode', '==', projectCode)
        .limit(1)
        .get();

      if (projectSnapshot.empty) {
        console.log(`No project found with code ${projectCode}`);
        return null;
      }

      const project = projectSnapshot.docs[0].data();
      const projectId = projectSnapshot.docs[0].id;

      // Fetch related data in parallel
      const [polesSnapshot, contractorsSnapshot, tasksSnapshot] = await Promise.all([
        // Get poles
        db.collection('planned-poles')
          .where('projectId', '==', projectId)
          .get(),
        
        // Get contractors
        db.collection('contractors')
          .where('projectIds', 'array-contains', projectId)
          .get(),
        
        // Get recent tasks
        db.collection('tasks')
          .where('projectId', '==', projectId)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get()
      ]);

      // Process poles data
      const poles = polesSnapshot.docs.map(doc => doc.data());
      const completedPoles = poles.filter(pole => 
        pole.status === 'completed' || pole.dateInstalled
      ).length;

      // Process contractors
      const contractors = contractorsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().companyName,
        teams: doc.data().teams || []
      }));

      // Process tasks
      const tasks = tasksSnapshot.docs.map(doc => doc.data());
      const pendingTasks = tasks.filter(task => task.status !== 'completed').length;

      const context = {
        project: {
          id: projectId,
          name: project.name,
          code: projectCode,
          client: project.client,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate
        },
        poles: {
          total: poles.length,
          completed: completedPoles,
          pending: poles.length - completedPoles,
          completionRate: poles.length > 0 ? Math.round((completedPoles / poles.length) * 100) : 0
        },
        contractors: contractors,
        tasks: {
          total: tasks.length,
          pending: pendingTasks,
          recentTasks: tasks.slice(0, 5).map(t => ({
            name: t.name,
            status: t.status,
            assignee: t.assignee
          }))
        },
        lastUpdated: new Date().toISOString()
      };

      // Cache the context
      await this.memoryService.storeContext(projectCode, context);

      return context;
    } catch (error) {
      console.error('Error fetching project context:', error);
      return null;
    }
  }

  buildSystemPrompt(context) {
    let prompt = `You are the FibreFlow Orchestrator Agent, an intelligent assistant for fiber optic network project management.

CAPABILITIES:
- Project status tracking and reporting
- Pole installation monitoring
- Contractor management
- Inventory/stock tracking
- Task management
- Daily progress reports

CONTEXT AWARENESS:
- Current session: ${context.sessionId}
- Time: ${context.timestamp}
`;

    // Add intent-specific context
    if (context.intent?.intent) {
      prompt += `\nUser Intent: ${context.intent.intent} (confidence: ${context.intent.confidence.toFixed(2)})`;
    }

    // Add recent conversation context
    if (context.recentConversations.length > 0) {
      prompt += '\n\nRECENT CONVERSATION HISTORY:';
      context.recentConversations.forEach((conv, index) => {
        prompt += `\n${index + 1}. User: ${conv.userMessage}`;
        prompt += `\n   You: ${conv.agentResponse.substring(0, 100)}...`;
      });
    }

    // Add project-specific context
    if (context.projectData) {
      const pd = context.projectData;
      prompt += `\n\nCURRENT PROJECT DATA:
PROJECT: ${pd.project.name} (${pd.project.code})
- Status: ${pd.project.status}
- Client: ${pd.project.client}
- Timeline: ${pd.project.startDate} to ${pd.project.endDate}

POLES:
- Total: ${pd.poles.total}
- Completed: ${pd.poles.completed} (${pd.poles.completionRate}%)
- Pending: ${pd.poles.pending}

CONTRACTORS: ${pd.contractors.map(c => c.name).join(', ') || 'None assigned'}

TASKS:
- Total: ${pd.tasks.total}
- Pending: ${pd.tasks.pending}
`;
    }

    // Add learned patterns
    if (context.relevantPatterns.length > 0) {
      prompt += '\n\nLEARNED PATTERNS:';
      context.relevantPatterns.slice(0, 3).forEach(pattern => {
        prompt += `\n- Pattern: "${pattern.pattern}" → Intent: ${pattern.intent}`;
      });
    }

    prompt += `\n\nINSTRUCTIONS:
- Be concise and specific in responses
- Use actual data when available
- If data is missing, explain what's needed
- Maintain conversation continuity
- Learn from user interactions`;

    return prompt;
  }
}

module.exports = ContextBuilder;