import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  collectionData,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  component?: string;
  url?: string;
  userAgent?: string;
  timestamp?: Date | { toDate: () => Date } | string | number;
  data?: string;
  stack?: string;
  sessionId: string;
}

@Component({
  selector: 'app-debug-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
  ],
  template: `
    <div class="debug-logs-container" style="padding: 20px;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>🔍 Debug Logs</mat-card-title>
          <mat-card-subtitle>Real-time application logs for debugging</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="All Logs">
              <div class="logs-table">
                <table mat-table [dataSource]="(allLogs$ | async) || []" class="full-width-table">
                  <ng-container matColumnDef="timestamp">
                    <th mat-header-cell *matHeaderCellDef>Time</th>
                    <td mat-cell *matCellDef="let log">
                      {{ formatTimestamp(log.timestamp) }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="level">
                    <th mat-header-cell *matHeaderCellDef>Level</th>
                    <td mat-cell *matCellDef="let log">
                      <mat-chip [class]="'level-' + log.level">{{ log.level }}</mat-chip>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="component">
                    <th mat-header-cell *matHeaderCellDef>Component</th>
                    <td mat-cell *matCellDef="let log">{{ log.component || 'App' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="message">
                    <th mat-header-cell *matHeaderCellDef>Message</th>
                    <td mat-cell *matCellDef="let log">
                      <div class="message-cell">
                        {{ log.message }}
                        <div *ngIf="log.data" class="log-data">
                          <strong>Data:</strong> {{ log.data }}
                        </div>
                        <div *ngIf="log.stack" class="log-stack">
                          <strong>Stack:</strong>
                          <pre>{{ log.stack }}</pre>
                        </div>
                      </div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="url">
                    <th mat-header-cell *matHeaderCellDef>URL</th>
                    <td mat-cell *matCellDef="let log">
                      <small>{{ getShortUrl(log.url) }}</small>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr
                    mat-row
                    *matRowDef="let row; columns: displayedColumns"
                    [class]="'row-' + row.level"
                  ></tr>
                </table>
              </div>
            </mat-tab>

            <mat-tab label="Errors Only">
              <div class="logs-table">
                <table mat-table [dataSource]="(errorLogs$ | async) || []" class="full-width-table">
                  <ng-container matColumnDef="timestamp">
                    <th mat-header-cell *matHeaderCellDef>Time</th>
                    <td mat-cell *matCellDef="let log">
                      {{ formatTimestamp(log.timestamp) }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="component">
                    <th mat-header-cell *matHeaderCellDef>Component</th>
                    <td mat-cell *matCellDef="let log">{{ log.component || 'App' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="message">
                    <th mat-header-cell *matHeaderCellDef>Error Details</th>
                    <td mat-cell *matCellDef="let log">
                      <div class="error-details">
                        <h4>{{ log.message }}</h4>
                        <div *ngIf="log.data" class="error-data">
                          <strong>Additional Data:</strong>
                          <pre>{{ log.data }}</pre>
                        </div>
                        <div *ngIf="log.stack" class="error-stack">
                          <strong>Stack Trace:</strong>
                          <pre>{{ log.stack }}</pre>
                        </div>
                      </div>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="['timestamp', 'component', 'message']"></tr>
                  <tr
                    mat-row
                    *matRowDef="let row; columns: ['timestamp', 'component', 'message']"
                    class="error-row"
                  ></tr>
                </table>
              </div>
            </mat-tab>
          </mat-tab-group>

          <div class="actions" style="margin-top: 20px;">
            <button mat-raised-button color="primary" (click)="refreshLogs()">
              <mat-icon>refresh</mat-icon>
              Refresh Logs
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .debug-logs-container {
        max-width: 100%;
        overflow-x: auto;
      }

      .logs-table {
        margin-top: 16px;
        max-height: 600px;
        overflow-y: auto;
      }

      .full-width-table {
        width: 100%;
      }

      .message-cell {
        max-width: 400px;
        word-wrap: break-word;
      }

      .log-data,
      .log-stack {
        margin-top: 8px;
        font-size: 12px;
        color: #666;
      }

      .log-stack pre,
      .error-stack pre,
      .error-data pre {
        white-space: pre-wrap;
        font-size: 11px;
        background: #f5f5f5;
        padding: 8px;
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
      }

      .level-error {
        background-color: #ffebee;
        color: #c62828;
      }

      .level-warn {
        background-color: #fff3e0;
        color: #ef6c00;
      }

      .level-info {
        background-color: #e3f2fd;
        color: #1565c0;
      }

      .level-debug {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }

      .row-error {
        background-color: #ffebee;
      }

      .error-row {
        background-color: #ffebee;
      }

      .error-details h4 {
        margin: 0 0 8px 0;
        color: #c62828;
      }

      .error-data,
      .error-stack {
        margin-top: 12px;
      }
    `,
  ],
})
export class DebugLogsComponent implements OnInit {
  private firestore = inject(Firestore);

  allLogs$!: Observable<LogEntry[]>;
  errorLogs$!: Observable<LogEntry[]>;

  displayedColumns = ['timestamp', 'level', 'component', 'message', 'url'];

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    const logsCollection = collection(this.firestore, 'debug-logs');

    // All logs - last 100 entries
    const allLogsQuery = query(logsCollection, orderBy('timestamp', 'desc'), limit(100));
    this.allLogs$ = collectionData(allLogsQuery, { idField: 'id' }) as Observable<LogEntry[]>;

    // Error logs only - last 50 error entries
    const errorLogsQuery = query(logsCollection, orderBy('timestamp', 'desc'), limit(50));
    this.errorLogs$ = collectionData(errorLogsQuery, { idField: 'id' }).pipe(
      map(
        (logs) =>
          (logs as LogEntry[]).filter((log: LogEntry) => log.level === 'error') as LogEntry[],
      ),
    ) as Observable<LogEntry[]>;
  }

  refreshLogs() {
    this.loadLogs();
  }

  formatTimestamp(timestamp: Date | { toDate: () => Date } | string | number | undefined): string {
    if (!timestamp) return 'N/A';

    let date: Date;
    if ((timestamp as any).toDate) {
      date = (timestamp as any).toDate();
    } else if ((timestamp as any).seconds) {
      date = new Date((timestamp as any).seconds * 1000);
    } else {
      date = new Date(timestamp as string | number | Date);
    }

    return date.toLocaleString();
  }

  getShortUrl(url?: string): string {
    if (!url) return 'N/A';
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
  }
}
