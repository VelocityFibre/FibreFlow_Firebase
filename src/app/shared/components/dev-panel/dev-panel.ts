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
import { DevTask, PageError } from '../../../core/models/dev-note.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
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
      console.log('DevPanel: Calling agent chat service...');

      // Send to agent
      const response = await this.agentChat.sendMessage(message).toPromise();

      console.log('DevPanel: Received response from agent:', response);

      if (response) {
        // Add agent response with enhanced context info
        let responseContent = response.response || 'No response from agent';

        // Add database context indicator if used
        if (response.mode === 'database-enhanced' && response.dataUsed) {
          responseContent += `\n\n*📊 Database context used: ${response.dataUsed.join(', ')}*`;
        }

        console.log('DevPanel: Adding agent response to chat:', {
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
        console.warn('DevPanel: No response received from agent');
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
      console.error('DevPanel: Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });

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
