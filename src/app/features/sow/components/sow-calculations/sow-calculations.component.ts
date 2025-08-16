import { Component, EventEmitter, Output, Input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-sow-calculations',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatDividerModule,
    MatProgressBarModule
  ],
  template: `
    <div class="sow-calculations-container">
      <!-- Header -->
      <div class="calculations-header">
        <mat-icon>calculate</mat-icon>
        <h2>SOW Calculations</h2>
        <p>Configure parameters and generate time and cost estimates</p>
      </div>

      <!-- Calculation Form -->
      <form [formGroup]="calculationForm" class="calculation-form">
        <!-- Installation Rates -->
        <mat-card class="rates-card">
          <mat-card-header>
            <mat-card-title>Installation Rates</mat-card-title>
            <mat-card-subtitle>Configure daily installation rates</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field>
                <mat-label>Poles per Day</mat-label>
                <input matInput type="number" formControlName="polesPerDay" min="1" max="20">
                <mat-hint>Average poles installed per day</mat-hint>
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Drops per Day</mat-label>
                <input matInput type="number" formControlName="dropsPerDay" min="1" max="50">
                <mat-hint>Average drops connected per day</mat-hint>
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Fibre per Day (m)</mat-label>
                <input matInput type="number" formControlName="fibrePerDay" min="100" max="5000">
                <mat-hint>Metres of fibre installed per day</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Cost Factors -->
        <mat-card class="costs-card">
          <mat-card-header>
            <mat-card-title>Cost Factors</mat-card-title>
            <mat-card-subtitle>Configure cost parameters</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field>
                <mat-label>Cost per Pole (R)</mat-label>
                <input matInput type="number" formControlName="costPerPole" min="100" max="10000">
                <mat-hint>Installation cost per pole</mat-hint>
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Cost per Drop (R)</mat-label>
                <input matInput type="number" formControlName="costPerDrop" min="50" max="2000">
                <mat-hint>Installation cost per drop</mat-hint>
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Cost per Metre Fibre (R)</mat-label>
                <input matInput type="number" formControlName="costPerMetreFibre" min="5" max="100">
                <mat-hint>Cost per metre of fibre installation</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Additional Factors -->
        <mat-card class="factors-card">
          <mat-card-header>
            <mat-card-title>Project Factors</mat-card-title>
            <mat-card-subtitle>Adjust for project-specific conditions</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field>
                <mat-label>Complexity Factor</mat-label>
                <mat-select formControlName="complexityFactor">
                  <mat-option value="0.8">Low (0.8x) - Easy terrain</mat-option>
                  <mat-option value="1.0">Medium (1.0x) - Standard conditions</mat-option>
                  <mat-option value="1.3">High (1.3x) - Difficult terrain</mat-option>
                  <mat-option value="1.5">Very High (1.5x) - Complex conditions</mat-option>
                </mat-select>
                <mat-hint>Adjust for terrain and access difficulty</mat-hint>
              </mat-form-field>
              
              <mat-form-field>
                <mat-label>Contingency (%)</mat-label>
                <input matInput type="number" formControlName="contingencyPercent" min="0" max="50">
                <mat-hint>Buffer for unexpected work</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>
      </form>

      <!-- Calculation Results -->
      <mat-card *ngIf="calculationResult()" class="results-card">
        <mat-card-header>
          <mat-card-title>
            Calculation Results
            <mat-icon color="accent">done</mat-icon>
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Time Estimates -->
          <div class="result-section">
            <h3>Time Estimates</h3>
            <div class="estimate-grid">
              <div class="estimate-item">
                <span class="estimate-value">{{ calculationResult()!.estimatedDays }}</span>
                <span class="estimate-label">Working Days</span>
              </div>
              <div class="estimate-item">
                <span class="estimate-value">{{ calculationResult()!.estimatedWeeks }}</span>
                <span class="estimate-label">Weeks</span>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Cost Estimates -->
          <div class="result-section">
            <h3>Cost Estimates</h3>
            <div class="cost-breakdown">
              <div class="cost-item">
                <span class="cost-label">Poles:</span>
                <span class="cost-value">{{ formatCurrency(calculationResult()!.poleCosts) }}</span>
              </div>
              <div class="cost-item">
                <span class="cost-label">Drops:</span>
                <span class="cost-value">{{ formatCurrency(calculationResult()!.dropCosts) }}</span>
              </div>
              <div class="cost-item">
                <span class="cost-label">Fibre:</span>
                <span class="cost-value">{{ formatCurrency(calculationResult()!.fibreCosts) }}</span>
              </div>
              <div class="cost-item subtotal">
                <span class="cost-label">Subtotal:</span>
                <span class="cost-value">{{ formatCurrency(calculationResult()!.subtotal) }}</span>
              </div>
              <div class="cost-item">
                <span class="cost-label">Contingency:</span>
                <span class="cost-value">{{ formatCurrency(calculationResult()!.contingency) }}</span>
              </div>
              <div class="cost-item total">
                <span class="cost-label">Total:</span>
                <span class="cost-value">{{ formatCurrency(calculationResult()!.totalCost) }}</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          mat-raised-button 
          color="primary"
          [disabled]="!calculationResult() || isLoading"
          (click)="proceedToSummary()">
          <mat-icon>summarize</mat-icon>
          Review Summary
        </button>
        
        <button 
          mat-stroked-button
          [disabled]="isLoading"
          (click)="recalculate()">
          <mat-icon>refresh</mat-icon>
          Recalculate
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
  styleUrl: './sow-calculations.component.scss'
})
export class SOWCalculationsComponent implements OnInit {
  @Output() calculationsComplete = new EventEmitter<any>();
  @Output() reviewRequested = new EventEmitter<void>();
  
  @Input() validatedData = signal<any>(null);
  @Input() projectId = signal<string>('');
  @Input() isLoading = false;

  private fb = inject(FormBuilder);

  calculationResult = signal<any>(null);

  calculationForm = this.fb.group({
    polesPerDay: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
    dropsPerDay: [15, [Validators.required, Validators.min(1), Validators.max(50)]],
    fibrePerDay: [1000, [Validators.required, Validators.min(100), Validators.max(5000)]],
    costPerPole: [2500, [Validators.required, Validators.min(100), Validators.max(10000)]],
    costPerDrop: [800, [Validators.required, Validators.min(50), Validators.max(2000)]],
    costPerMetreFibre: [25, [Validators.required, Validators.min(5), Validators.max(100)]],
    complexityFactor: [1.0, [Validators.required]],
    contingencyPercent: [15, [Validators.required, Validators.min(0), Validators.max(50)]]
  });

  ngOnInit() {
    // Auto-calculate when form values change
    this.calculationForm.valueChanges.subscribe(() => {
      if (this.calculationForm.valid && this.validatedData()) {
        this.calculateSOW();
      }
    });

    // Initial calculation if data is available
    if (this.validatedData()) {
      this.calculateSOW();
    }
  }

  calculateSOW() {
    const data = this.validatedData();
    const formValues = this.calculationForm.value;
    
    if (!data || !formValues) return;

    const poleCount = data.poles?.length || 0;
    const dropCount = data.drops?.length || 0;
    const totalFibreDistance = data.fibre?.reduce((sum: number, f: any) => sum + (f.distance || 0), 0) || 0;

    // Time calculations
    const poleDays = Math.ceil(poleCount / (formValues.polesPerDay! * formValues.complexityFactor!));
    const dropDays = Math.ceil(dropCount / (formValues.dropsPerDay! * formValues.complexityFactor!));
    const fibreDays = Math.ceil(totalFibreDistance / (formValues.fibrePerDay! * formValues.complexityFactor!));
    
    const estimatedDays = Math.max(poleDays, dropDays, fibreDays);
    const estimatedWeeks = Math.ceil(estimatedDays / 5);

    // Cost calculations
    const poleCosts = poleCount * formValues.costPerPole!;
    const dropCosts = dropCount * formValues.costPerDrop!;
    const fibreCosts = totalFibreDistance * formValues.costPerMetreFibre!;
    
    const subtotal = poleCosts + dropCosts + fibreCosts;
    const contingency = subtotal * (formValues.contingencyPercent! / 100);
    const totalCost = subtotal + contingency;

    const result = {
      // Time estimates
      estimatedDays,
      estimatedWeeks,
      
      // Cost breakdown
      poleCosts,
      dropCosts,
      fibreCosts,
      subtotal,
      contingency,
      totalCost,
      
      // Input parameters
      parameters: formValues,
      
      // Data summary
      counts: {
        poles: poleCount,
        drops: dropCount,
        totalFibreDistance
      }
    };

    this.calculationResult.set(result);
    
    // Emit to parent
    this.calculationsComplete.emit({
      poles: data.poles,
      drops: data.drops,
      fibre: data.fibre,
      calculations: result,
      estimatedDays,
      totalCost
    });
  }

  recalculate() {
    this.calculateSOW();
  }

  proceedToSummary() {
    this.reviewRequested.emit();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(value);
  }
}