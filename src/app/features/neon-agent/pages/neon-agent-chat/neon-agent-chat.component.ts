import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NeonGeminiAgentService, NeonQueryResponse } from '@app/core/services/neon-gemini-agent.service';
import { firstValueFrom } from 'rxjs';
import { MarkdownPipe } from '@app/shared/pipes/markdown.pipe';

interface ChatMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    executionTime?: number;
    sqlQuery?: string;
    model?: string;
  };
}

@Component({
  selector: 'app-neon-agent-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MarkdownPipe
  ],
  templateUrl: './neon-agent-chat.component.html',
  styleUrl: './neon-agent-chat.component.scss'
})
export class NeonAgentChatComponent implements OnInit {
  private neonAgent = inject(NeonGeminiAgentService);
  private snackBar = inject(MatSnackBar);

  // UI State
  messages = signal<ChatMessage[]>([]);
  inputMessage = signal('');
  isLoading = signal(false);
  agentAvailable = signal(false);
  showSqlQueries = signal(false);
  
  // Agent info
  agentStats = signal<any>(null);
  databaseInfo = signal<any>(null);

  ngOnInit() {
    this.checkAgentStatus();
    this.loadDatabaseInfo();
  }

  async checkAgentStatus() {
    try {
      const isAvailable = await firstValueFrom(this.neonAgent.isServiceRunning());
      this.agentAvailable.set(isAvailable);
      
      if (isAvailable) {
        this.addSystemMessage('🎯 Neon+Gemini Agent is ready! Ask me about your fiber optic data.');
        // Load agent stats
        const stats = await firstValueFrom(this.neonAgent.getAgentStats());
        this.agentStats.set(stats);
      } else {
        this.addSystemMessage('⚠️ Neon+Gemini Agent is not available. Please ensure the Python server is running on port 8000.');
      }
    } catch (error) {
      console.error('Failed to check agent status:', error);
      this.agentAvailable.set(false);
      this.addSystemMessage('❌ Failed to connect to Neon+Gemini Agent. Please check the server.');
    }
  }

  async loadDatabaseInfo() {
    try {
      const info = await firstValueFrom(this.neonAgent.getDatabaseInfo());
      this.databaseInfo.set(info);
    } catch (error) {
      console.error('Failed to load database info:', error);
    }
  }

  private addSystemMessage(content: string) {
    this.messages.update(msgs => [...msgs, {
      role: 'system',
      content,
      timestamp: new Date()
    }]);
  }

  async sendMessage() {
    const message = this.inputMessage().trim();
    if (!message || this.isLoading()) return;

    // Add user message
    this.messages.update(msgs => [...msgs, {
      role: 'user',
      content: message,
      timestamp: new Date()
    }]);

    // Clear input and set loading
    this.inputMessage.set('');
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.neonAgent.askQuestion(message, {
          include_sql: this.showSqlQueries(),
          include_metadata: true
        })
      );

      if (response.success && response.answer) {
        // Add agent response
        this.messages.update(msgs => [...msgs, {
          role: 'agent',
          content: response.answer,
          timestamp: new Date(),
          metadata: {
            executionTime: response.execution_time,
            sqlQuery: response.sql_query,
            model: response.metadata?.llm_model
          }
        }]);
      } else {
        // Show error
        this.messages.update(msgs => [...msgs, {
          role: 'agent',
          content: `Error: ${response.error || 'Failed to process query'}`,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      console.error('Query failed:', error);
      this.messages.update(msgs => [...msgs, {
        role: 'agent',
        content: `Error: ${error.message || 'Failed to communicate with agent'}`,
        timestamp: new Date()
      }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  sendSuggestedQuestion(question: string) {
    this.inputMessage.set(question);
    this.sendMessage();
  }

  getSuggestedQuestions(): string[] {
    return this.neonAgent.getSuggestedQuestions();
  }

  clearChat() {
    this.messages.set([]);
    this.neonAgent.clearHistory().subscribe({
      next: () => {
        this.snackBar.open('Chat history cleared', 'Close', { duration: 2000 });
      },
      error: (error) => {
        console.error('Failed to clear history:', error);
      }
    });
  }

  async testAgent() {
    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(this.neonAgent.testAgent());
      this.addSystemMessage(`Test Results: ${result.successful_tests}/${result.total_tests} passed`);
      
      // Show test results
      if (result.results && result.results.length > 0) {
        result.results.forEach((test: any) => {
          if (test.result) {
            this.addSystemMessage(`✅ ${test.test}: ${test.result}`);
          } else if (test.error) {
            this.addSystemMessage(`❌ ${test.test}: ${test.error}`);
          }
        });
      }
    } catch (error) {
      this.addSystemMessage('❌ Agent test failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  refreshStatus() {
    this.checkAgentStatus();
    this.loadDatabaseInfo();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  getMessageIcon(role: string): string {
    switch (role) {
      case 'user': return 'person';
      case 'agent': return 'psychology';
      case 'system': return 'info';
      default: return 'chat';
    }
  }

  getMessageClass(role: string): string {
    return `message-${role}`;
  }
}