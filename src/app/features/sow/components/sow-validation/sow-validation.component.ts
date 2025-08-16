import { Component, EventEmitter, Output, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

import { ExcelParseResult } from '../../models/sow-import.model';
import { ValidationResult } from '../../services/sow-validation.service';

@Component({
  selector: 'app-sow-validation',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatChipsModule,
    MatListModule,
    MatExpansionModule
  ],
  template: `
    <div class="sow-validation-container">
      <!-- Validation Header -->
      <div class="validation-header">
        <mat-icon>verified</mat-icon>
        <h2>Data Validation</h2>
        <p>Review and resolve any issues with your imported data</p>
      </div>

      <!-- Validation Summary -->
      <mat-card *ngIf="validationResult()" class="summary-card">
        <mat-card-header>
          <mat-card-title>
            Validation Summary
            <mat-icon 
              [class.success]="validationResult()!.isValid"
              [class.error]="!validationResult()!.isValid">
              {{ validationResult()!.isValid ? 'check_circle' : 'error' }}
            </mat-icon>
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="validation-stats">
            <div class="stat-item">
              <span class="stat-number">{{ validationResult()!.summary.totalRecords }}</span>
              <span class="stat-label">Total Records</span>
            </div>
            <div class="stat-item success">
              <span class="stat-number">{{ validationResult()!.summary.validRecords }}</span>
              <span class="stat-label">Valid Records</span>
            </div>
            <div class="stat-item" [class.error]="validationResult()!.summary.errorRecords > 0">
              <span class="stat-number">{{ validationResult()!.summary.errorRecords }}</span>
              <span class="stat-label">Errors</span>
            </div>
            <div class="stat-item" [class.warning]="validationResult()!.summary.warningRecords > 0">
              <span class="stat-number">{{ validationResult()!.summary.warningRecords }}</span>
              <span class="stat-label">Warnings</span>
            </div>
          </div>

          <!-- Validation Status -->
          <div class="validation-status">
            <mat-chip-set>
              <mat-chip 
                *ngIf="validationResult()!.isValid"
                class="success-chip">
                <mat-icon>check</mat-icon>
                Ready to Proceed
              </mat-chip>
              <mat-chip 
                *ngIf="!validationResult()!.isValid"
                class="error-chip">
                <mat-icon>warning</mat-icon>
                Issues Found
              </mat-chip>
            </mat-chip-set>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Validation Details -->
      <mat-card *ngIf="validationResult()" class="details-card">
        <mat-tab-group>
          <!-- Errors Tab -->
          <mat-tab [label]="'Errors (' + (validationResult()?.errors?.length || 0) + ')'">
            <div class="tab-content">
              <div *ngIf="validationResult()!.errors.length === 0" class="no-issues">
                <mat-icon color="accent">check_circle</mat-icon>
                <h3>No errors found!</h3>
                <p>All data passed validation checks.</p>
              </div>

              <mat-expansion-panel *ngIf="validationResult()!.errors.length > 0 || validationResult()!.isValid === false">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    Critical Issues ({{ getCriticalErrors().length || 1 }})
                  </mat-panel-title>
                </mat-expansion-panel-header>
                
                <mat-list>
                  <div *ngIf="getCriticalErrors().length === 0 && !validationResult()!.isValid">
                    <mat-list-item>
                      <mat-icon matListItemIcon color="warn">warning</mat-icon>
                      <div matListItemTitle>No poles imported</div>
                      <div matListItemLine>{{ validationResult()!.summary.totalRecords }} drops found but 0 poles. Drops cannot be linked to poles.</div>
                    </mat-list-item>
                  </div>
                  <mat-list-item *ngFor="let error of getCriticalErrors()">
                    <mat-icon matListItemIcon color="warn">error</mat-icon>
                    <div matListItemTitle>{{ error.message }}</div>
                    <div matListItemLine *ngIf="error.row">Row {{ error.row }}</div>
                  </mat-list-item>
                </mat-list>
              </mat-expansion-panel>

              <mat-expansion-panel *ngIf="getRegularErrors().length > 0">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    Other Errors ({{ getRegularErrors().length }})
                  </mat-panel-title>
                </mat-expansion-panel-header>
                
                <mat-list>
                  <mat-list-item *ngFor="let error of getRegularErrors()">
                    <mat-icon matListItemIcon color="warn">warning</mat-icon>
                    <div matListItemTitle>{{ error.message }}</div>
                    <div matListItemLine *ngIf="error.row">Row {{ error.row }}</div>
                  </mat-list-item>
                </mat-list>
              </mat-expansion-panel>
            </div>
          </mat-tab>

          <!-- Warnings Tab -->
          <mat-tab [label]="'Warnings (' + (validationResult()?.warnings?.length || 0) + ')'">
            <div class="tab-content">
              <div *ngIf="validationResult()!.warnings.length === 0" class="no-issues">
                <mat-icon color="accent">info</mat-icon>
                <h3>No warnings</h3>
                <p>Data quality looks good.</p>
              </div>

              <mat-list *ngIf="validationResult()!.warnings.length > 0">
                <mat-list-item *ngFor="let warning of validationResult()!.warnings">
                  <mat-icon matListItemIcon color="accent">info</mat-icon>
                  <div matListItemTitle>{{ warning.message }}</div>
                  <div matListItemLine *ngIf="warning.row">Row {{ warning.row }}</div>
                </mat-list-item>
              </mat-list>
            </div>
          </mat-tab>

          <!-- Data Preview Tab -->
          <mat-tab label="Data Preview">
            <div class="tab-content">
              <div class="data-preview">
                <div class="preview-section" *ngIf="importData()?.poles && importData()!.poles.length > 0">
                  <h4>Poles ({{ importData()!.poles.length }})</h4>
                  <div class="preview-items">
                    <mat-chip 
                      *ngFor="let pole of importData()!.poles.slice(0, 5)" 
                      class="data-chip">
                      {{ pole.label_1 }}
                    </mat-chip>
                    <span *ngIf="importData()!.poles.length > 5">
                      +{{ importData()!.poles.length - 5 }} more
                    </span>
                  </div>
                </div>

                <div class="preview-section" *ngIf="importData()?.drops && importData()!.drops.length > 0">
                  <h4>Drops ({{ importData()!.drops.length }})</h4>
                  <div class="preview-items">
                    <mat-chip 
                      *ngFor="let drop of importData()!.drops.slice(0, 5)" 
                      class="data-chip">
                      {{ drop.drop_number }}
                    </mat-chip>
                    <span *ngIf="importData()!.drops.length > 5">
                      +{{ importData()!.drops.length - 5 }} more
                    </span>
                  </div>
                </div>

                <div class="preview-section" *ngIf="importData()?.fibre && importData()!.fibre.length > 0">
                  <h4>Fibre Segments ({{ importData()!.fibre.length }})</h4>
                  <div class="preview-items">
                    <mat-chip 
                      *ngFor="let fibre of importData()!.fibre.slice(0, 5)" 
                      class="data-chip">
                      {{ fibre.segment_id }}
                    </mat-chip>
                    <span *ngIf="importData()!.fibre.length > 5">
                      +{{ importData()!.fibre.length - 5 }} more
                    </span>
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
          [disabled]="!canProceed() || isLoading"
          (click)="proceedToCalculations()">
          <mat-icon>calculate</mat-icon>
          Proceed to Calculations
        </button>
        
        <button 
          mat-stroked-button
          [disabled]="isLoading"
          (click)="fixIssues()">
          <mat-icon>build</mat-icon>
          Fix Issues
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
  styleUrl: './sow-validation.component.scss'
})
export class SOWValidationComponent implements OnInit {
  @Output() validationComplete = new EventEmitter<boolean>();
  @Output() recalculateRequested = new EventEmitter<void>();
  
  @Input() importData = signal<ExcelParseResult | null>(null);
  @Input() validationResult = signal<ValidationResult | null>(null);
  @Input() isLoading = false;

  ngOnInit() {
    // Emit validation status when component loads
    if (this.validationResult()) {
      this.validationComplete.emit(this.canProceed());
    }
  }

  canProceed(): boolean {
    const result = this.validationResult();
    if (!result) return false;
    
    // Can proceed if there are no critical errors
    return result.summary.criticalErrors === 0;
  }

  getCriticalErrors() {
    return this.validationResult()?.errors.filter(e => e.type === 'critical') || [];
  }

  getRegularErrors() {
    return this.validationResult()?.errors.filter(e => e.type !== 'critical') || [];
  }

  proceedToCalculations() {
    this.validationComplete.emit(true);
    this.recalculateRequested.emit();
  }

  fixIssues() {
    // For now, just show message about manual fixes
    // In the future, this could provide automated fixes
    alert('Please review the errors and warnings above. You may need to fix the source Excel file and re-import.');
  }
}