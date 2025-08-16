import { Component, Input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { UnifiedPoleService, UnifiedPoleView } from '../../../../core/services/unified-pole.service';

@Component({
  selector: 'app-unified-pole-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="unified-pole-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>merge_type</mat-icon>
          Unified Pole View
        </mat-card-title>
        <mat-card-subtitle>
          Combined data from all sources
        </mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        @if (isLoading()) {
          <div class="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading pole data...</p>
          </div>
        } @else if (poleData()) {
          <div class="pole-data">
            <!-- Data Sources -->
            <div class="data-sources">
              <h4>Data Sources</h4>
              <div class="source-chips">
                <mat-chip [color]="poleData()!.dataSources.firebase ? 'primary' : 'default'">
                  <mat-icon>cloud</mat-icon>
                  Firebase
                </mat-chip>
                <mat-chip [color]="poleData()!.dataSources.neon ? 'primary' : 'default'">
                  <mat-icon>storage</mat-icon>
                  Neon
                </mat-chip>
                <mat-chip [color]="poleData()!.dataSources.onemap ? 'primary' : 'default'">
                  <mat-icon>map</mat-icon>
                  OneMap
                </mat-chip>
                <mat-chip [color]="poleData()!.dataSources.sow ? 'primary' : 'default'">
                  <mat-icon>description</mat-icon>
                  SOW
                </mat-chip>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Status & Info -->
            <div class="status-section">
              <h4>Current Status</h4>
              @if (poleData()!.status) {
                <mat-chip [color]="getStatusColor(poleData()!.status!)">
                  {{ poleData()!.status }}
                </mat-chip>
                <span class="status-date">{{ poleData()!.statusDate | date:'medium' }}</span>
              } @else {
                <span class="no-data">No status updates</span>
              }
            </div>

            <mat-divider></mat-divider>

            <!-- Location Comparison -->
            <div class="location-section">
              <h4>Location Data</h4>
              <div class="location-grid">
                <div class="location-item">
                  <span class="label">Planned (SOW)</span>
                  @if (poleData()!.plannedLocation) {
                    <span class="coords">
                      {{ formatCoords(poleData()!.plannedLocation) }}
                    </span>
                  } @else {
                    <span class="no-data">Not available</span>
                  }
                </div>
                <div class="location-item">
                  <span class="label">Actual (Field)</span>
                  @if (poleData()!.actualLocation) {
                    <span class="coords">
                      {{ formatCoords(poleData()!.actualLocation) }}
                    </span>
                  } @else {
                    <span class="no-data">Not captured</span>
                  }
                </div>
              </div>
              
              @if (poleData()!.hasDiscrepancy) {
                <div class="discrepancy-alert">
                  <mat-icon color="warn">warning</mat-icon>
                  <span>Location discrepancy: {{ poleData()!.locationDiscrepancyMeters | number:'1.0-0' }}m</span>
                </div>
              }
            </div>

            <mat-divider></mat-divider>

            <!-- Field Work Status -->
            <div class="field-work-section">
              <h4>Field Work</h4>
              <div class="field-stats">
                <div class="stat">
                  <mat-icon>photo_camera</mat-icon>
                  <span>{{ poleData()!.photoCount }} photos</span>
                </div>
                <div class="stat">
                  <mat-icon [color]="poleData()!.qualityChecked ? 'primary' : 'default'">
                    {{ poleData()!.qualityChecked ? 'check_circle' : 'radio_button_unchecked' }}
                  </mat-icon>
                  <span>Quality Check</span>
                </div>
              </div>
              
              @if (poleData()!.capturedBy) {
                <p class="capture-info">
                  Captured by {{ poleData()!.capturedBy }} on {{ poleData()!.capturedAt | date:'medium' }}
                </p>
              }
            </div>

            <mat-divider></mat-divider>

            <!-- Data Completeness -->
            <div class="completeness-section">
              <h4>Data Completeness</h4>
              <div class="completeness-bar">
                <div class="progress" [style.width.%]="poleData()!.dataCompleteness"></div>
              </div>
              <span class="completeness-text">{{ poleData()!.dataCompleteness }}% complete</span>
              
              @if (poleData()!.dataGaps.length > 0) {
                <div class="data-gaps">
                  <strong>Missing:</strong>
                  <ul>
                    @for (gap of poleData()!.dataGaps; track gap) {
                      <li>{{ gap }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="no-data-message">
            <mat-icon>info</mat-icon>
            <p>No data available for this pole</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .unified-pole-card {
      margin: 16px 0;
      
      mat-card-header {
        margin-bottom: 16px;
        
        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }

    .loading {
      text-align: center;
      padding: 40px;
      
      p {
        margin-top: 16px;
        color: var(--mat-sys-outline);
      }
    }

    .pole-data {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    h4 {
      margin: 0 0 12px 0;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .data-sources {
      .source-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        
        mat-chip {
          mat-icon {
            margin-right: 4px;
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    .status-section {
      .status-date {
        margin-left: 12px;
        color: var(--mat-sys-outline);
        font-size: 14px;
      }
    }

    .location-section {
      .location-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      
      .location-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        
        .label {
          font-weight: 500;
          color: var(--mat-sys-outline);
          font-size: 14px;
        }
        
        .coords {
          font-family: monospace;
          font-size: 13px;
        }
      }
      
      .discrepancy-alert {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
        border-radius: 8px;
        
        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .field-work-section {
      .field-stats {
        display: flex;
        gap: 24px;
        margin-bottom: 12px;
        
        .stat {
          display: flex;
          align-items: center;
          gap: 8px;
          
          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }
      }
      
      .capture-info {
        margin: 8px 0 0 0;
        color: var(--mat-sys-outline);
        font-size: 14px;
      }
    }

    .completeness-section {
      .completeness-bar {
        height: 8px;
        background: var(--mat-sys-surface-variant);
        border-radius: 4px;
        overflow: hidden;
        margin: 8px 0;
        
        .progress {
          height: 100%;
          background: var(--mat-sys-primary);
          transition: width 0.3s ease;
        }
      }
      
      .completeness-text {
        display: block;
        text-align: center;
        color: var(--mat-sys-outline);
        font-size: 14px;
        margin-bottom: 16px;
      }
      
      .data-gaps {
        background: var(--mat-sys-surface-variant);
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        
        strong {
          display: block;
          margin-bottom: 8px;
        }
        
        ul {
          margin: 0;
          padding-left: 20px;
        }
      }
    }

    .no-data, .no-data-message {
      color: var(--mat-sys-outline);
      font-style: italic;
    }

    .no-data-message {
      text-align: center;
      padding: 40px;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
    }

    mat-divider {
      margin: 0;
    }
  `]
})
export class UnifiedPoleViewComponent implements OnInit {
  @Input({ required: true }) poleNumber!: string;
  
  private unifiedPoleService = inject(UnifiedPoleService);
  
  poleData = signal<UnifiedPoleView | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    this.loadPoleData();
  }

  private loadPoleData(): void {
    this.isLoading.set(true);
    this.unifiedPoleService.getUnifiedPoleView(this.poleNumber).subscribe({
      next: (data) => {
        this.poleData.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading unified pole data:', error);
        this.isLoading.set(false);
      }
    });
  }

  formatCoords(location: { latitude: number; longitude: number }): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    if (status.toLowerCase().includes('approved')) return 'primary';
    if (status.toLowerCase().includes('progress')) return 'accent';
    if (status.toLowerCase().includes('declined') || status.toLowerCase().includes('failed')) return 'warn';
    return 'primary';
  }
}