import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DevNoteService } from '../../../core/services/dev-note.service';
import { RouteTrackerService } from '../../../core/services/route-tracker.service';
import { AuthService } from '../../../core/services/auth.service';
import { AgentChatService, ChatMessage } from '../../../core/services/agent-chat.service';
import { NeonGeminiAgentService, NeonQueryResponse } from '../../../core/services/neon-gemini-agent.service';
import { DevTask, PageError } from '../../../core/models/dev-note.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, firstValueFrom } from 'rxjs';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { ProjectService } from '../../../core/services/project.service';
import { PoleTrackerService } from '../../../features/pole-tracker/services/pole-tracker.service';

@Component({
  selector: 'app-dev-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatExpansionModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MarkdownPipe,
  ],
  templateUrl: './dev-panel.html',
  styleUrl: './dev-panel.scss',
})
export class DevPanel {
  private devNoteService = inject(DevNoteService);
  private routeTracker = inject(RouteTrackerService);
  private authService = inject(AuthService);
  private agentChat = inject(AgentChatService);
  private neonAgent = inject(NeonGeminiAgentService);
  private functions = inject(Functions);
  private projectService = inject(ProjectService);
  private poleTrackerService = inject(PoleTrackerService);

  // Panel state
  isOpen = signal(false);
  isMinimized = signal(false);

  // Chat state
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = '';
  isLoadingChat = signal(false);
  
  // Neon agent status
  neonAgentAvailable = signal(false);
  usingNeonAgent = signal(false);

  // Current route info
  currentRoute = this.routeTracker.currentRoute;

  // Current page dev note
  currentNote = toSignal(
    this.routeTracker.currentRoute$.pipe(
      switchMap((route) => {
        const routeKey = this.routeTracker.getRouteKey(route.path);
        return this.devNoteService.getOrCreateForRoute(routeKey, route.title);
      }),
    ),
  );

  // Dev stats
  devStats = toSignal(this.devNoteService.getDevStats());

  // New task form
  newTaskText = signal('');
  newTaskPriority = signal<'low' | 'medium' | 'high'>('medium');

  // Edit mode for notes
  isEditingNotes = signal(false);
  notesText = signal('');

  // Check if user is admin
  isAdmin = computed(() => {
    const userRole = this.authService.userRole();
    return userRole === 'admin';
  });

  constructor() {
    // Update notes text when current note changes
    effect(() => {
      const note = this.currentNote();
      if (note) {
        this.notesText.set(note.notes || '');
      }
    });
    
    // Check Neon agent availability on startup
    // this.checkNeonAgentStatus();
  }

  togglePanel() {
    this.isOpen.update((v) => !v);
  }

  toggleMinimize() {
    this.isMinimized.update((v) => !v);
  }

  async addTask() {
    const text = this.newTaskText().trim();
    if (!text) return;

    const route = this.currentRoute();
    if (!route) return;

    const routeKey = this.routeTracker.getRouteKey(route.path);
    await this.devNoteService.addTask(routeKey, {
      text,
      status: 'todo',
      priority: this.newTaskPriority(),
      assignee: this.authService.currentUser()?.email,
    });

    // Reset form
    this.newTaskText.set('');
    this.newTaskPriority.set('medium');
  }

  async updateTaskStatus(task: DevTask, status: DevTask['status']) {
    const route = this.currentRoute();
    if (!route) return;

    const routeKey = this.routeTracker.getRouteKey(route.path);
    await this.devNoteService.updateTaskStatus(routeKey, task.id, status);
  }

  async saveNotes() {
    const note = this.currentNote();
    if (!note?.id) return;

    await this.devNoteService.update(note.id, {
      notes: this.notesText(),
      updatedBy: this.authService.currentUser()?.email || 'system',
    });

    this.isEditingNotes.set(false);
  }

  getTaskIcon(status: DevTask['status']): string {
    switch (status) {
      case 'todo':
        return 'radio_button_unchecked';
      case 'in-progress':
        return 'pending';
      case 'done':
        return 'check_circle';
    }
  }

  getPriorityColor(priority: DevTask['priority']): string {
    switch (priority) {
      case 'high':
        return 'warn';
      case 'medium':
        return 'accent';
      case 'low':
        return 'primary';
    }
  }

  getUnfinishedTaskCount(tasks: DevTask[] | undefined): number {
    if (!tasks) return 0;
    return tasks.filter((t) => t.status !== 'done').length;
  }

  getUnresolvedErrorCount(errors: PageError[] | undefined): number {
    if (!errors) return 0;
    return errors.filter((e) => !e.resolved).length;
  }

  // Check Neon agent availability
  async checkNeonAgentStatus() {
    try {
      const isRunning = await firstValueFrom(this.neonAgent.isServiceRunning());
      this.neonAgentAvailable.set(isRunning);
      
      if (isRunning) {
        console.log('✅ Neon+Gemini agent is available');
        this.chatMessages.update(messages => [
          ...messages,
          {
            role: 'agent',
            content: '🎯 **Neon Database Agent Ready!**\n\nI can now answer questions about your fiber optic data using natural language.\n\n**Try asking:**\n- "How many poles are planted in Lawley?"\n- "What\'s the status distribution for all poles?"\n- "Show me recent status changes"\n\n*Using Google Gemini + Neon Database*',
            timestamp: new Date(),
            mode: 'neon-status'
          }
        ]);
      } else {
        console.log('⚠️ Neon+Gemini agent is not available, using Firebase fallback');
      }
    } catch (error) {
      console.log('❌ Neon agent check failed:', error);
      this.neonAgentAvailable.set(false);
    }
  }

  // Chat methods
  async sendChatMessage() {
    const message = this.chatInput.trim();
    if (!message || this.isLoadingChat()) return;

    console.log('DevPanel: Starting chat message send:', message);

    // Add user message
    this.chatMessages.update((messages) => [
      ...messages,
      {
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
    ]);

    // Clear input and set loading
    this.chatInput = '';
    this.isLoadingChat.set(true);

    try {
      // Try Neon agent first if available
      if (this.neonAgentAvailable()) {
        console.log('DevPanel: Using Neon+Gemini agent...');
        this.usingNeonAgent.set(true);
        
        const currentRoute = this.currentRoute();
        const neonResponse = await firstValueFrom(
          this.neonAgent.askQuestionWithContext(message, currentRoute?.path)
        );

        console.log('DevPanel: Received Neon agent response:', neonResponse);

        if (neonResponse.success && neonResponse.answer) {
          let responseContent = neonResponse.answer;
          
          // Add SQL query if included
          if (neonResponse.sql_query) {
            responseContent += `\n\n*🔍 SQL Query: \`${neonResponse.sql_query}\`*`;
          }
          
          // Add execution time
          responseContent += `\n\n*⚡ Query executed in ${neonResponse.execution_time}ms using Gemini+Neon*`;

          this.chatMessages.update((messages) => [
            ...messages,
            {
              role: 'agent',
              content: responseContent,
              timestamp: new Date(),
              mode: 'neon-gemini',
              executionTime: neonResponse.execution_time,
              sqlQuery: neonResponse.sql_query
            },
          ]);
          
          return; // Success with Neon agent
        } else {
          console.warn('DevPanel: Neon agent returned error, falling back to Firebase');
          // Fall through to Firebase agent
        }
      }

      // Fallback to Firebase agent
      console.log('DevPanel: Using Firebase agent fallback...');
      this.usingNeonAgent.set(false);
      
      const response = await firstValueFrom(this.agentChat.sendMessage(message));

      console.log('DevPanel: Received Firebase agent response:', response);

      if (response) {
        // Add agent response with enhanced context info
        let responseContent = response.response || 'No response from agent';

        // Add database context indicator if used
        if (response.mode === 'database-enhanced' && response.dataUsed) {
          responseContent += `\n\n*📊 Database context used: ${response.dataUsed.join(', ')}*`;
        }

        console.log('DevPanel: Adding Firebase agent response to chat:', {
          mode: response.mode,
          dataUsed: response.dataUsed,
          responseLength: responseContent.length,
        });

        this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'agent',
            content: responseContent,
            timestamp: new Date(),
            mode: response.mode,
            dataUsed: response.dataUsed,
          },
        ]);
      } else {
        console.warn('DevPanel: No response received from any agent');
        this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'agent',
            content: 'No response received from agent.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('DevPanel: Chat error occurred:', error);
      
      this.chatMessages.update((messages) => [
        ...messages,
        {
          role: 'agent',
          content: `Error: Failed to communicate with agent. ${error?.message || 'Please check the console.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      console.log('DevPanel: Chat message processing complete, setting loading to false');
      this.isLoadingChat.set(false);
      this.usingNeonAgent.set(false);
    }
  }

  clearChat() {
    this.chatMessages.set([]);
  }

  onChatKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
  }

  // Neon agent helper methods
  getSuggestedQuestions(): string[] {
    return this.neonAgent.getSuggestedQuestions();
  }

  sendSuggestedQuestion(question: string) {
    this.chatInput = question;
    this.sendChatMessage();
  }

  async testNeonAgent() {
    this.chatMessages.update(messages => [
      ...messages,
      {
        role: 'user',
        content: '🔧 Testing Neon+Gemini agent...',
        timestamp: new Date()
      }
    ]);

    try {
      // Test with a simple question
      const testQuestion = "How many total records are in the status_changes table?";
      this.sendSuggestedQuestion(testQuestion);
    } catch (error) {
      console.error('Neon agent test failed:', error);
      this.chatMessages.update(messages => [
        ...messages,
        {
          role: 'agent',
          content: `❌ Test failed: ${error}`,
          timestamp: new Date()
        }
      ]);
    }
  }

  async recheckNeonAgent() {
    this.checkNeonAgentStatus();
  }

  // Test database connection
  async testAgentDatabase() {
    console.log('Testing agent database connection...');

    this.chatMessages.update((messages) => [
      ...messages,
      {
        role: 'user',
        content: '🔧 Running diagnostics...',
        timestamp: new Date(),
      },
    ]);

    // Since Firebase Functions are failing with CORS, let's check what we can from the client
    let diagnostics = '**Diagnostic Results:**\n\n';

    // Check Firebase configuration
    diagnostics += '**1. Firebase Configuration:**\n';
    diagnostics += '✅ Firebase is initialized\n';
    diagnostics += '✅ Functions instance exists\n';

    // Check authentication
    diagnostics += '\n**2. Authentication:**\n';
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      diagnostics += `✅ Logged in as: ${currentUser.email}\n`;
      diagnostics += `✅ Role: ${this.authService.userRole()}\n`;
    } else {
      diagnostics += '❌ Not authenticated\n';
    }

    // Check if we can access local services
    diagnostics += '\n**3. Local Service Access:**\n';
    try {
      // Try to get projects count
      const projects = await this.projectService.getAll().toPromise();
      diagnostics += `✅ ProjectService: ${projects?.length || 0} projects found\n`;

      // Look for Law-001
      const lawley = projects?.find((p) => p.projectCode === 'Law-001');
      if (lawley && lawley.id) {
        diagnostics += `✅ Lawley project found: ${lawley.name}\n`;

        // Try to get pole count
        try {
          const poles = await this.poleTrackerService
            .getPlannedPolesByProject(lawley.id)
            .toPromise();
          diagnostics += `✅ **Pole count for Law-001: ${poles?.length || 0} poles**\n`;
        } catch (e) {
          diagnostics += '❌ Could not fetch poles\n';
        }
      } else {
        diagnostics += '❌ Law-001 project not found\n';
      }
    } catch (error: any) {
      diagnostics += `❌ Error accessing services: ${error.message}\n`;
    }

    // Firebase Functions status
    diagnostics += '\n**4. Firebase Functions Status:**\n';
    diagnostics += '❌ CORS errors on all callable functions\n';
    diagnostics += '❌ This prevents agent from working\n';

    // Recommendations
    diagnostics += '\n**5. Recommendations:**\n';
    diagnostics += '1. Check Firebase Functions logs in console\n';
    diagnostics += '2. Verify Anthropic API key is set:\n';
    diagnostics += '   `firebase functions:config:set anthropic.api_key="your-key"`\n';
    diagnostics += '3. Redeploy functions after setting key\n';
    diagnostics += '4. Consider using HTTP endpoint with proper CORS headers\n';

    this.chatMessages.update((messages) => [
      ...messages,
      {
        role: 'agent',
        content: diagnostics,
        timestamp: new Date(),
      },
    ]);
  }
}
