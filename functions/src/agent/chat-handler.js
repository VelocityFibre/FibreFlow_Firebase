const functions = require('firebase-functions');
const Anthropic = require('@anthropic-ai/sdk');
const MemoryService = require('./memory-service');
const IntentAnalyzer = require('./intent-analyzer');
const ContextBuilder = require('./context-builder');

class ChatHandler {
  constructor() {
    this.memoryService = new MemoryService();
    this.intentAnalyzer = new IntentAnalyzer();
    this.contextBuilder = new ContextBuilder(this.memoryService);
    
    // Initialize Anthropic client
    const apiKey = functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  async handleChat(data) {
    const { message, sessionId = 'default', userId = 'anonymous' } = data;
    
    if (!message) {
      throw new functions.https.HttpsError('invalid-argument', 'Message is required');
    }

    try {
      console.log(`Processing chat message: "${message}" for session: ${sessionId}`);
      
      // 1. Analyze intent
      const intent = this.intentAnalyzer.analyze(message);
      console.log('Intent analysis:', intent);
      
      // 2. Build context
      const context = await this.contextBuilder.buildContext(message, intent, sessionId);
      console.log('Context built successfully');
      
      // 3. Generate response using Anthropic
      const response = await this.generateResponse(message, context);
      console.log('Response generated');
      
      // 4. Store conversation in memory
      await this.memoryService.storeConversation({
        sessionId,
        userId,
        message,
        response,
        intent,
        context: {
          projectCode: intent.entities?.projectCode,
          intent: intent.intent,
          confidence: intent.confidence
        }
      });
      
      // 5. Learn from interaction
      if (intent.intent && intent.confidence > 0.7) {
        await this.memoryService.storePattern(
          message.toLowerCase().trim(),
          intent.intent,
          intent.confidence
        );
      }
      
      return {
        success: true,
        response,
        intent: intent.intent,
        confidence: intent.confidence,
        entities: intent.entities,
        sessionId
      };
      
    } catch (error) {
      console.error('Chat handler error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Failed to process chat message'
      );
    }
  }

  async generateResponse(message, context) {
    try {
      const messages = [
        {
          role: 'user',
          content: message
        }
      ];
      
      // Add conversation history if available
      if (context.recentConversations && context.recentConversations.length > 0) {
        // Build message history for better context
        const history = [];
        context.recentConversations.forEach(conv => {
          history.push({
            role: 'user',
            content: conv.userMessage
          });
          history.push({
            role: 'assistant',
            content: conv.agentResponse
          });
        });
        
        // Insert history before current message
        messages.unshift(...history);
      }
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.3,
        system: context.systemPrompt,
        messages: messages
      });
      
      if (response.content && response.content[0] && response.content[0].text) {
        return response.content[0].text;
      } else {
        throw new Error('Invalid response format from Anthropic');
      }
      
    } catch (error) {
      console.error('Anthropic API error:', error);
      
      // Fallback responses based on intent
      if (context.intent?.intent) {
        return this.getFallbackResponse(context.intent.intent, context.intent.entities);
      }
      
      return 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.';
    }
  }

  getFallbackResponse(intent, entities) {
    const fallbacks = {
      pole_count: `I understand you're asking about pole counts${entities.projectCode ? ` for project ${entities.projectCode}` : ''}. I'm having trouble accessing the data right now. Please try again in a moment.`,
      
      project_status: `I see you want to know about project status${entities.projectCode ? ` for ${entities.projectCode}` : ''}. I'm currently unable to fetch that information. Please try again.`,
      
      contractor_info: 'I can help you with contractor information once my connection is restored. Please try again shortly.',
      
      help: `I'm the FibreFlow Assistant. I can help you with:
- Project status and tracking
- Pole installation counts
- Contractor assignments
- Inventory management
- Task tracking
- Daily progress reports

How can I assist you today?`,
      
      default: `I understand your request but I'm having temporary difficulties. Please try rephrasing or try again in a moment.`
    };
    
    return fallbacks[intent] || fallbacks.default;
  }
}

module.exports = ChatHandler;