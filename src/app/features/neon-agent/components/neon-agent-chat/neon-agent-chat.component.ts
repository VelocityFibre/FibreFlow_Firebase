import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

import { SimpleNeonAIService as NeonAgentService, ChatMessage, NeonAIHealth as NeonAgentDetailedHealth, DatabaseInfo } from '../../../../core/services/simple-neon-ai.service';

@Component({
  selector: 'app-neon-agent-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatDividerModule
  ],
  template: `
    <div class="neon-agent-chat">
      <!-- Header -->
      <div class="header">
        <h1>
          <mat-icon>smart_toy</mat-icon>
          Neon + Gemini AI Agent
        </h1>
        <div class="header-actions">
          <button 
            mat-stroked-button 
            color="primary" 
            (click)="refreshConnection()"
            [disabled]="neonAgent.isLoading()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <mat-chip-set>
            <mat-chip [color]="getStatusColor()" [highlighted]="true">
              {{ getStatusText() }}
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <!-- Connection Status Card -->
      <mat-card class="status-card" [class]="'status-' + neonAgent.healthStatus()">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ getConnectionIcon() }}</mat-icon>
            Connection Status
          </mat-card-title>
          <mat-card-subtitle>Direct Connection (Always Available)</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">Database</span>
              <mat-icon [color]="neonAgent.lastHealthCheck()?.database_connected ? 'primary' : 'warn'">
                {{ neonAgent.lastHealthCheck()?.database_connected ? 'check_circle' : 'error' }}
              </mat-icon>
            </div>
            <div class="status-item">
              <span class="status-label">AI Agent</span>
              <mat-icon [color]="neonAgent.lastHealthCheck()?.agent_ready ? 'primary' : 'warn'">
                {{ neonAgent.lastHealthCheck()?.agent_ready ? 'psychology' : 'error' }}
              </mat-icon>
            </div>
            <div class="status-item">
              <span class="status-label">Uptime</span>
              <span class="status-value">{{ formatUptime(neonAgent.lastHealthCheck()?.uptime) }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Pool</span>
              <span class="status-value">{{ neonAgent.lastHealthCheck()?.connection_pool?.status || 'Unknown' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabs for Chat and Database Info -->
      <mat-tab-group>
        <!-- Chat Tab -->
        <mat-tab label="AI Chat" class="chat-tab">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Natural Language Database Queries</mat-card-title>
              <mat-card-subtitle>Ask questions about your OneMap pole data in plain English</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <!-- Chat Container -->
              <div class="chat-container">
                <!-- Chat Messages -->
                <div class="chat-messages" #chatMessages>
                  @if (neonAgent.chatHistory().length === 0) {
                    <div class="chat-welcome">
                      <mat-icon>smart_toy</mat-icon>
                      <h3>Welcome to your AI Data Assistant!</h3>
                      <p>Ask me questions about your OneMap pole data using natural language:</p>
                      <div class="example-queries">
                        <button mat-stroked-button (click)="sendExample('How many poles are approved in Lawley?')">
                          <mat-icon>poll</mat-icon>
                          "How many poles are approved in Lawley?"
                        </button>
                        <button mat-stroked-button (click)="sendExample('Which agent has the most installations?')">
                          <mat-icon>person</mat-icon>
                          "Which agent has the most installations?"
                        </button>
                        <button mat-stroked-button (click)="sendExample('What is the status of pole LAW.P.B167?')">
                          <mat-icon>search</mat-icon>
                          "What is the status of pole LAW.P.B167?"
                        </button>
                        <button mat-stroked-button (click)="sendExample('Show me poles with pending permissions')">
                          <mat-icon>pending</mat-icon>
                          "Show me poles with pending permissions"
                        </button>
                      </div>
                    </div>
                  }

                  @for (message of neonAgent.chatHistory(); track message.id) {
                    <div class="chat-message" [class]="'message-' + message.type">
                      <div class="message-content">
                        <div class="message-text" [innerHTML]="formatMessageContent(message.content)"></div>
                        @if (message.execution_time) {
                          <div class="message-meta">
                            <mat-icon>schedule</mat-icon>
                            Executed in {{ message.execution_time }}ms
                          </div>
                        }
                      </div>
                      <div class="message-timestamp">
                        {{ message.timestamp | date:'short' }}
                      </div>
                    </div>
                  }

                  @if (neonAgent.isProcessingQuery()) {
                    <div class="chat-message message-assistant processing">
                      <div class="message-content">
                        <mat-spinner diameter="20"></mat-spinner>
                        <span>Analyzing your query and running SQL...</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Chat Input -->
                <form class="chat-input-form" [formGroup]="chatForm" (ngSubmit)="sendMessage()">
                  <mat-form-field appearance="outline" class="chat-input-field">
                    <mat-label>Ask about your data...</mat-label>
                    <input matInput 
                           formControlName="message" 
                           placeholder="e.g., How many homes are installed this month?"
                           [disabled]="!neonAgent.isReady() || neonAgent.isProcessingQuery()"
                           (keydown.enter)="sendMessage()">
                    <mat-hint>Press Enter to send, Ctrl+Enter for new line</mat-hint>
                  </mat-form-field>
                  
                  <button mat-fab 
                          color="primary" 
                          type="submit"
                          [disabled]="chatForm.invalid || !neonAgent.isReady() || neonAgent.isProcessingQuery()"
                          class="chat-send-button">
                    <mat-icon>send</mat-icon>
                  </button>
                </form>

                <!-- Chat Actions -->
                <div class="chat-actions">
                  <button mat-button (click)="clearChat()" [disabled]="neonAgent.chatHistory().length === 0">
                    <mat-icon>clear_all</mat-icon>
                    Clear Chat
                  </button>
                  <button mat-button (click)="exportChat()" [disabled]="neonAgent.chatHistory().length === 0">
                    <mat-icon>download</mat-icon>
                    Export Chat
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <!-- Database Info Tab -->
        <mat-tab label="Database Info" class="database-tab">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Database Information</mat-card-title>
              <mat-card-subtitle>Neon PostgreSQL database details and available tables</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (databaseInfo()) {
                <div class="database-info">
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Connection Status</span>
                      <mat-chip [color]="databaseInfo()!.connection_status === 'connected' ? 'primary' : 'warn'">
                        {{ databaseInfo()!.connection_status | titlecase }}
                      </mat-chip>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Database Version</span>
                      <span class="info-value">{{ databaseInfo()!.database_version || 'Unknown' }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Total Tables</span>
                      <span class="info-value">{{ databaseInfo()!.total_tables || 0 }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Connection Pool</span>
                      <span class="info-value">{{ databaseInfo()!.connection_pool || 'N/A' }}</span>
                    </div>
                  </div>

                  @if (databaseInfo()!.table_statistics) {
                    <mat-divider></mat-divider>
                    <h3>Table Statistics</h3>
                    <div class="table-stats">
                      @for (stat of getTableStats(); track stat.name) {
                        <div class="stat-item">
                          <span class="stat-name">{{ stat.name }}</span>
                          <span class="stat-count">{{ stat.count | number }}</span>
                        </div>
                      }
                    </div>
                  }

                  @if (databaseInfo()!.supported_queries?.length) {
                    <mat-divider></mat-divider>
                    <h3>Supported Query Types</h3>
                    <mat-chip-set>
                      @for (queryType of databaseInfo()!.supported_queries; track queryType) {
                        <mat-chip>{{ queryType }}</mat-chip>
                      }
                    </mat-chip-set>
                  }
                </div>
              } @else {
                <div class="loading-container">
                  <mat-spinner></mat-spinner>
                  <p>Loading database information...</p>
                </div>
              }

              <div class="database-actions">
                <button mat-raised-button color="primary" (click)="refreshDatabaseInfo()">
                  <mat-icon>refresh</mat-icon>
                  Refresh Info
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </mat-tab>
      </mat-tab-group>

      <!-- Error Display -->
      @if (neonAgent.error()) {
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon color="warn">error</mat-icon>
            <span>{{ neonAgent.error() }}</span>
            <button mat-button color="primary" (click)="refreshConnection()">
              <mat-icon>refresh</mat-icon>
              Retry
            </button>
          </mat-card-content>
        </mat-card>
      }
      
      <!-- Service Ready Info -->
      @if (neonAgent.isConnected()) {
        <mat-card class="success-card" style="background: #e8f5e8; margin-top: 16px;">
          <mat-card-content>
            <div style="display: flex; align-items: center; gap: 8px;">
              <mat-icon color="primary">check_circle</mat-icon>
              <span><strong>Service Ready!</strong> This agent connects directly to Neon database and Gemini AI - no server setup required!</span>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .neon-agent-chat {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      flex: 1;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-card {
      margin-bottom: 24px;
    }

    .status-card.status-healthy {
      border-left: 4px solid #4caf50;
    }

    .status-card.status-partial {
      border-left: 4px solid #ff9800;
    }

    .status-card.status-unhealthy {
      border-left: 4px solid #f44336;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .status-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .status-value {
      font-size: 16px;
      font-weight: 500;
    }

    .chat-container {
      height: 600px;
      display: flex;
      flex-direction: column;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 16px;
      background: #fafafa;
      max-height: 400px;
    }

    .chat-welcome {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .chat-welcome mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #2196f3;
      margin-bottom: 16px;
    }

    .chat-welcome h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .example-queries {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 20px;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .example-queries button {
      text-align: left;
    }

    .chat-message {
      margin-bottom: 16px;
      animation: slideIn 0.3s ease-out;
    }

    .chat-message.message-user {
      display: flex;
      justify-content: flex-end;
    }

    .chat-message.message-user .message-content {
      background: #2196f3;
      color: white;
      padding: 12px 16px;
      border-radius: 18px 18px 4px 18px;
      max-width: 70%;
    }

    .chat-message.message-assistant {
      display: flex;
      justify-content: flex-start;
    }

    .chat-message.message-assistant .message-content {
      background: white;
      color: #333;
      padding: 12px 16px;
      border-radius: 18px 18px 18px 4px;
      max-width: 80%;
      border: 1px solid #e0e0e0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .chat-message.message-system .message-content {
      background: #fff3cd;
      color: #856404;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #ffeaa7;
    }

    .chat-message.processing .message-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .message-text {
      line-height: 1.5;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.7;
    }

    .message-timestamp {
      font-size: 10px;
      color: #999;
      margin-top: 4px;
      text-align: center;
    }

    .chat-input-form {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 16px;
    }

    .chat-input-field {
      flex: 1;
    }

    .chat-send-button {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .chat-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .database-info {
      margin-top: 16px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .info-value {
      font-size: 16px;
      font-weight: 500;
    }

    .table-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .stat-name {
      font-weight: 500;
    }

    .stat-count {
      color: #2196f3;
      font-weight: 600;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      gap: 16px;
    }

    .database-actions {
      margin-top: 24px;
      display: flex;
      gap: 16px;
    }

    .error-card {
      background: #ffebee;
      margin-top: 16px;
    }

    .error-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
    }

    .info-card {
      background: #e3f2fd;
      margin-top: 16px;
      border: 1px solid #2196f3;
    }

    .info-card mat-icon {
      color: #2196f3;
    }

    .info-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
    }

    .info-card ol {
      margin: 16px 0;
      padding-left: 20px;
    }

    .info-card li {
      margin: 8px 0;
    }

    .info-card code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }

    .info-card a {
      color: #2196f3;
      text-decoration: none;
    }

    .info-card a:hover {
      text-decoration: underline;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    h3 {
      margin: 16px 0 8px 0;
      color: #333;
    }
  `]
})
export class NeonAgentChatComponent implements OnInit, AfterViewChecked {
  protected neonAgent: NeonAgentService = inject(NeonAgentService);
  private fb: FormBuilder = inject(FormBuilder);

  @ViewChild('chatMessages') chatMessages!: ElementRef;

  chatForm: FormGroup;
  databaseInfo = signal<DatabaseInfo | null>(null);
  private shouldScrollToBottom = false;

  constructor() {
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    this.loadDatabaseInfo();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    if (this.chatForm.invalid || !this.neonAgent.isReady()) return;

    const message = this.chatForm.get('message')?.value.trim();
    if (!message) return;

    this.chatForm.reset();
    this.shouldScrollToBottom = true;

    this.neonAgent.sendChatMessage(message, 'fibreflow-user').subscribe({
      next: () => {
        this.shouldScrollToBottom = true;
      },
      error: (error: any) => {
        console.error('Failed to send message:', error);
      }
    });
  }

  sendExample(exampleQuery: string): void {
    this.chatForm.patchValue({ message: exampleQuery });
    this.sendMessage();
  }

  clearChat(): void {
    this.neonAgent.clearChatHistory();
  }

  exportChat(): void {
    const chatData = {
      timestamp: new Date().toISOString(),
      service_url: this.neonAgent.serviceUrl(),
      chat_history: this.neonAgent.chatHistory()
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neon-agent-chat-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  refreshConnection(): void {
    this.neonAgent.refreshConnection().subscribe({
      next: () => {
        this.loadDatabaseInfo();
      },
      error: (error: any) => {
        console.error('Failed to refresh connection:', error);
      }
    });
  }

  loadDatabaseInfo(): void {
    this.neonAgent.getDatabaseInfo().subscribe({
      next: (info: DatabaseInfo) => {
        this.databaseInfo.set(info);
      },
      error: (error: any) => {
        console.error('Failed to load database info:', error);
      }
    });
  }

  refreshDatabaseInfo(): void {
    this.loadDatabaseInfo();
  }

  getStatusColor(): string {
    switch (this.neonAgent.healthStatus()) {
      case 'healthy': return 'primary';
      case 'partial': return 'accent';
      case 'unhealthy': return 'warn';
      default: return '';
    }
  }

  getStatusText(): string {
    switch (this.neonAgent.healthStatus()) {
      case 'healthy': return 'Ready';
      case 'partial': return 'Partial';
      case 'unhealthy': return 'Offline';
      default: return 'Unknown';
    }
  }

  getConnectionIcon(): string {
    switch (this.neonAgent.healthStatus()) {
      case 'healthy': return 'cloud_done';
      case 'partial': return 'cloud_sync';
      case 'unhealthy': return 'cloud_off';
      default: return 'cloud_queue';
    }
  }

  getTableStats(): Array<{name: string; count: number}> {
    const stats = this.databaseInfo()?.table_statistics;
    if (!stats) return [];

    return Object.entries(stats).map(([name, count]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: count as number
    }));
  }

  formatUptime(seconds?: number): string {
    if (!seconds) return 'Unknown';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  formatMessageContent(content: string): string {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br>') // Line breaks
      .replace(/^### (.*$)/gm, '<h3>$1</h3>') // H3 headers
      .replace(/^## (.*$)/gm, '<h2>$1</h2>') // H2 headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>') // H1 headers
      .replace(/• (.*?)(?=<br>|$)/g, '<li>$1</li>') // List items
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>'); // Wrap lists in ul tags
  }

  private scrollToBottom(): void {
    try {
      const element = this.chatMessages.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  handleEnterKey(event: KeyboardEvent): void {
    if (!event.ctrlKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}