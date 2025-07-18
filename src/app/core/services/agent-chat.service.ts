import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, catchError, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { DirectAnthropicService } from './direct-anthropic.service';
import { ProjectService } from './project.service';
import { PoleTrackerService } from '../../features/pole-tracker/services/pole-tracker.service';
import { ContractorService } from '../../features/contractors/services/contractor.service';
import { StockService } from '../../features/stock/services/stock.service';
import { DailyProgressService } from '../../features/daily-progress/services/daily-progress.service';

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  context?: unknown;
  user?: string;
  mode?: string;
  dataUsed?: string[];
}

export interface ProjectContext {
  projectId: string;
  projectName: string;
  projectCode: string;
  totalPoles: number;
  completedPoles: number;
  pendingPoles: number;
  contractors: string[];
  lastUpdated: string;
}

@Injectable({ providedIn: 'root' })
export class AgentChatService {
  private http = inject(HttpClient);
  private functions = inject(Functions);
  private directAnthropic = inject(DirectAnthropicService);
  private projectService = inject(ProjectService);
  private poleTrackerService = inject(PoleTrackerService);
  private contractorService = inject(ContractorService);
  private stockService = inject(StockService);
  private dailyProgressService = inject(DailyProgressService);
  
  // Default API key for app UI access
  private apiKey = 'app-ui-key';
  
  // Project code patterns to detect (case insensitive)
  private projectCodePattern = /\b([A-Za-z]{2,4}-\d{3})\b/gi;

  sendMessage(message: string, context?: unknown): Observable<ChatResponse> {
    console.log('Sending message to Firebase agent:', { message });
    
    // Generate session ID for this conversation
    const sessionId = `fibreflow-${Date.now()}`;
    
    // Use Firebase callable function (proper approach)
    return this.tryCallableFunction(message, sessionId, context);
  }

  private tryCallableFunction(message: string, sessionId: string, context?: unknown): Observable<ChatResponse> {
    console.log('Using Firebase callable function...');
    
    try {
      // Ensure Firebase Functions is properly configured
      const agentChat = httpsCallable(this.functions, 'agentChat');
      
      return from(agentChat({ 
        message, 
        sessionId,
        userId: 'fibreflow-app',
        context 
      })).pipe(
      map((result: any) => {
        console.log('Firebase agent callable response:', result);
        // Firebase callable functions return data directly, not wrapped in .data
        const responseData = result.data || result;
        return {
          success: true,
          response: responseData.response || responseData.message || 'No response received',
          mode: 'firebase-agent-callable',
          user: 'FibreFlow Agent',
          dataUsed: responseData.dataUsed || [],
          context: responseData.context,
          intent: responseData.intent,
          confidence: responseData.confidence
        } as ChatResponse;
      }),
      catchError((error) => {
        console.error('Firebase agent callable error:', error);
        // Final fallback to direct API
        return this.sendFallbackMessage(message);
      })
      );
    } catch (setupError) {
      console.error('Firebase Functions setup error:', setupError);
      // If Firebase Functions can't be set up, go directly to fallback
      return this.sendFallbackMessage(message);
    }
  }

  // Fallback to direct API if Firebase Functions fail
  private sendFallbackMessage(message: string): Observable<ChatResponse> {
    console.log('Using fallback direct API');
    const systemPrompt = `You are the FibreFlow Orchestrator Agent. Help with project management, contractors, inventory, and technical issues.

CONTEXT:
- This is the FibreFlow project management system
- User is working on fiber optic network projects
- Key features: Projects, BOQ, Contractors, Stock Management, Pole Tracker, Daily Progress

Be concise and practical in your responses.`;

    return this.directAnthropic.sendMessage(message, systemPrompt).pipe(
      map((response) => {
        console.log('Fallback API response:', response);
        return {
          success: true,
          response,
          mode: 'fallback-direct',
          user: 'FibreFlow App (Fallback)'
        };
      }),
      catchError((error) => {
        console.error('Fallback API error:', error);
        return of({
          success: false,
          response: 'Error: Could not reach the agent. Please check your internet connection.',
        });
      })
    );
  }

  // Search agent memory using Firebase Functions
  searchMemory(query: string): Observable<any[]> {
    const searchMemory = httpsCallable(this.functions, 'searchAgentMemory');
    
    return from(searchMemory({ query })).pipe(
      map((result: any) => result.data.results || []),
      catchError((error) => {
        console.error('Memory search error:', error);
        return of([]);
      })
    );
  }

  // Get agent statistics
  getAgentStats(): Observable<any> {
    const getStats = httpsCallable(this.functions, 'getAgentStats');
    
    return from(getStats({})).pipe(
      map((result: any) => result.data),
      catchError((error) => {
        console.error('Agent stats error:', error);
        return of({ conversations: 0, patterns: 0, contexts: 0 });
      })
    );
  }

  private extractProjectCodes(message: string): string[] {
    const matches = message.match(this.projectCodePattern);
    return matches ? [...new Set(matches)] : [];
  }

  private getErrorMessage(error: any): string {
    if (error.code === 'unauthenticated') {
      return 'Invalid API key. Please check your authentication.';
    } else if (error.code === 'invalid-argument') {
      return 'Invalid request. Please provide a message.';
    } else if (error.code === 'internal') {
      return `Error: ${error.message || 'Internal server error'}`;
    } else {
      return 'Error: Could not reach the orchestrator agent. Please try again later.';
    }
  }
}

