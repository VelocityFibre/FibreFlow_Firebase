import { Component, EventEmitter, Output, Input, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SOWData } from '../../models/sow.model';

@Component({
  selector: 'app-sow-summary',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressBarModule
  ],
  template: `
    <div class="sow-summary-container">
      <!-- Header -->
      <div class="summary-header">
        <mat-icon>summarize</mat-icon>
        <h2>SOW Summary</h2>
        <p>Review your Scope of Work before saving</p>
      </div>

      <!-- Project Info -->
      <mat-card *ngIf="projectData()" class="project-card">
        <mat-card-header>
          <mat-card-title>Project Information</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="project-info">
            <div class="info-item">
              <span class="info-label">Project:</span>
              <span class="info-value">{{ projectData()!.title }}</span>
            </div>
            <div class="info-item" *ngIf="projectData()!.client">
              <span class="info-label">Client:</span>
              <span class="info-value">{{ projectData()!.client.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Type:</span>
              <span class="info-value">{{ projectData()!.type || 'FTTH' }}</span>
            </div>
            <div class="info-item" *ngIf="projectData()!.location">
              <span class="info-label">Location:</span>
              <span class="info-value">{{ projectData()!.location }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- SOW Overview -->
      <mat-card *ngIf="sowData()" class="overview-card">
        <mat-card-header>
          <mat-card-title>SOW Overview</mat-card-title>
          <mat-card-subtitle>Version {{ sowData()!.version }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Key Metrics -->
          <div class="metrics-grid">
            <div class="metric-item">
              <mat-icon>account_tree</mat-icon>
              <span class="metric-value">{{ sowData()!.poles?.length || 0 }}</span>
              <span class="metric-label">Poles</span>
            </div>
            <div class="metric-item">
              <mat-icon>home</mat-icon>
              <span class="metric-value">{{ sowData()!.drops?.length || 0 }}</span>
              <span class="metric-label">Drops</span>
            </div>
            <div class="metric-item">
              <mat-icon>cable</mat-icon>
              <span class="metric-value">{{ getTotalFibreDistance() }}</span>
              <span class="metric-label">Fibre (m)</span>
            </div>
            <div class="metric-item">
              <mat-icon>schedule</mat-icon>
              <span class="metric-value">{{ sowData()!.estimatedDays || 0 }}</span>
              <span class="metric-label">Days</span>
            </div>
            <div class="metric-item total-cost">
              <mat-icon>attach_money</mat-icon>
              <span class="metric-value">{{ formatCurrency(sowData()!.totalCost || 0) }}</span>
              <span class="metric-label">Total Cost</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Status Indicators -->
          <div class="status-indicators">
            <mat-chip-set>
              <mat-chip class="status-chip">
                <mat-icon>task_alt</mat-icon>
                Data Validated
              </mat-chip>
              <mat-chip class="status-chip">
                <mat-icon>calculate</mat-icon>
                Calculations Complete
              </mat-chip>
              <mat-chip class="status-chip ready">
                <mat-icon>check_circle</mat-icon>
                Ready to Save
              </mat-chip>
            </mat-chip-set>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Detailed Breakdown -->
      <mat-card class="breakdown-card">
        <mat-tab-group>
          <!-- Installation Details -->
          <mat-tab label="Installation Details">
            <div class="tab-content">
              <div class="breakdown-section" *ngIf="sowData()?.calculations">
                <h3>Time Breakdown</h3>
                <div class="time-details">
                  <div class="time-item">
                    <span class="time-label">Estimated Working Days:</span>
                    <span class="time-value">{{ sowData()!.calculations.estimatedDays }}</span>
                  </div>
                  <div class="time-item">
                    <span class="time-label">Estimated Weeks:</span>
                    <span class="time-value">{{ sowData()!.calculations.estimatedWeeks }}</span>
                  </div>
                  <div class="time-item">
                    <span class="time-label">Complexity Factor:</span>
                    <span class="time-value">{{ sowData()!.calculations.parameters.complexityFactor }}x</span>
                  </div>
                </div>
              </div>

              <mat-divider></mat-divider>

              <div class="breakdown-section" *ngIf="sowData()?.calculations">
                <h3>Installation Rates</h3>
                <div class="rate-details">
                  <div class="rate-item">
                    <span class="rate-label">Poles per Day:</span>
                    <span class="rate-value">{{ sowData()!.calculations.parameters.polesPerDay }}</span>
                  </div>
                  <div class="rate-item">
                    <span class="rate-label">Drops per Day:</span>
                    <span class="rate-value">{{ sowData()!.calculations.parameters.dropsPerDay }}</span>
                  </div>
                  <div class="rate-item">
                    <span class="rate-label">Fibre per Day:</span>
                    <span class="rate-value">{{ sowData()!.calculations.parameters.fibrePerDay }}m</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Cost Breakdown -->
          <mat-tab label="Cost Analysis">
            <div class="tab-content">
              <div class="breakdown-section" *ngIf="sowData()?.calculations">
                <h3>Cost Breakdown</h3>
                <div class="cost-analysis">
                  <div class="cost-row">
                    <span class="cost-label">Poles ({{ sowData()!.poles?.length || 0 }} × {{ formatCurrency(sowData()!.calculations.parameters.costPerPole) }}):</span>
                    <span class="cost-value">{{ formatCurrency(sowData()!.calculations.poleCosts) }}</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">Drops ({{ sowData()!.drops?.length || 0 }} × {{ formatCurrency(sowData()!.calculations.parameters.costPerDrop) }}):</span>
                    <span class="cost-value">{{ formatCurrency(sowData()!.calculations.dropCosts) }}</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">Fibre ({{ getTotalFibreDistance() }}m × {{ formatCurrency(sowData()!.calculations.parameters.costPerMetreFibre) }}):</span>
                    <span class="cost-value">{{ formatCurrency(sowData()!.calculations.fibreCosts) }}</span>
                  </div>
                  <div class="cost-row subtotal">
                    <span class="cost-label">Subtotal:</span>
                    <span class="cost-value">{{ formatCurrency(sowData()!.calculations.subtotal) }}</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">Contingency ({{ sowData()!.calculations.parameters.contingencyPercent }}%):</span>
                    <span class="cost-value">{{ formatCurrency(sowData()!.calculations.contingency) }}</span>
                  </div>
                  <div class="cost-row total">
                    <span class="cost-label">Total Cost:</span>
                    <span class="cost-value">{{ formatCurrency(sowData()!.calculations.totalCost) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Data Summary -->
          <mat-tab label="Data Summary">
            <div class="tab-content">
              <div class="data-summary">
                <div class="summary-section" *ngIf="hasPoles()">
                  <h4>Poles ({{ getPoles().length }})</h4>
                  <p class="summary-text">Pole installation data imported and validated</p>
                  <div class="sample-items">
                    <mat-chip *ngFor="let pole of getPoles().slice(0, 3)">{{ pole.label_1 }}</mat-chip>
                    <span *ngIf="getPoles().length > 3">+{{ getPoles().length - 3 }} more</span>
                  </div>
                </div>

                <div class="summary-section" *ngIf="hasDrops()">
                  <h4>Drops ({{ getDrops().length }})</h4>
                  <p class="summary-text">Drop connection data imported and validated</p>
                  <div class="sample-items">
                    <mat-chip *ngFor="let drop of getDrops().slice(0, 3)">{{ drop.drop_number }}</mat-chip>
                    <span *ngIf="getDrops().length > 3">+{{ getDrops().length - 3 }} more</span>
                  </div>
                </div>

                <div class="summary-section" *ngIf="hasFibre()">
                  <h4>Fibre Segments ({{ getFibre().length }})</h4>
                  <p class="summary-text">Fibre installation routes and distances</p>
                  <div class="sample-items">
                    <mat-chip *ngFor="let fibre of getFibre().slice(0, 3)">{{ fibre.segment_id }}</mat-chip>
                    <span *ngIf="getFibre().length > 3">+{{ getFibre().length - 3 }} more</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          mat-raised-button 
          color="primary"
          [disabled]="isLoading"
          (click)="saveSOW()">
          <mat-icon>save</mat-icon>
          Save SOW
        </button>
        
        <button 
          mat-stroked-button
          color="accent"
          [disabled]="isLoading"
          (click)="exportToExcel()">
          <mat-icon>download</mat-icon>
          Export to Excel
        </button>
      </div>

      <!-- Loading -->
      <mat-progress-bar 
        *ngIf="isLoading" 
        mode="indeterminate"
        class="loading-bar">
      </mat-progress-bar>
    </div>
  `,
  styleUrl: './sow-summary.component.scss'
})
export class SOWSummaryComponent {
  @Output() saveRequested = new EventEmitter<void>();
  @Output() exportRequested = new EventEmitter<void>();
  
  sowData = input<SOWData | null>(null);
  projectData = input<any>(null);
  @Input() isLoading = false;

  getTotalFibreDistance(): number {
    const fibre = this.sowData()?.fibre;
    if (!fibre || fibre.length === 0) return 0;
    
    return fibre.reduce((sum, f) => sum + (f.distance || 0), 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(value);
  }

  // Helper methods for template
  getPoles() {
    return this.sowData()?.poles || [];
  }

  getDrops() {
    return this.sowData()?.drops || [];
  }

  getFibre() {
    return this.sowData()?.fibre || [];
  }

  hasPoles(): boolean {
    return this.getPoles().length > 0;
  }

  hasDrops(): boolean {
    return this.getDrops().length > 0;
  }

  hasFibre(): boolean {
    return this.getFibre().length > 0;
  }

  saveSOW() {
    this.saveRequested.emit();
  }

  exportToExcel() {
    this.exportRequested.emit();
  }
}