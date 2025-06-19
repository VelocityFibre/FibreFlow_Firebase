import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface StepData {
  id: string;
  name: string;
  description?: string;
  phaseId: string;
  phaseName: string;
  orderNo: number;
}

export interface PhaseWithSteps {
  id: string;
  name: string;
  description: string;
  orderNo: number;
  steps: StepData[];
  stepCount: number;
}

@Component({
  selector: 'app-all-steps-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="all-steps-page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <button mat-button (click)="navigateHome()">
          <mat-icon>home</mat-icon>
          Home
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <span class="breadcrumb-current">Steps</span>
      </nav>

      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>All Project Steps</h1>
          <p class="subtitle">Complete overview of all 32 project steps organized by phase</p>
        </div>
      </div>


      <!-- Steps by Phase -->
      <div class="phases-section">
        <mat-accordion multi="true">
          <mat-expansion-panel 
            *ngFor="let phase of filteredPhases(); trackBy: trackByPhase"
            [expanded]="false"
            class="phase-panel"
          >
            <mat-expansion-panel-header>
              <mat-panel-title>
                <div class="phase-header">
                  <button 
                    mat-button 
                    class="phase-link"
                    (click)="navigateToPhases($event)"
                  >
                    <mat-icon>flag</mat-icon>
                    {{ phase.name }}
                  </button>
                  <mat-chip class="step-count-chip">
                    {{ phase.stepCount }} steps
                  </mat-chip>
                </div>
              </mat-panel-title>
              <mat-panel-description>
                {{ phase.description }}
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="phase-content">
              <div class="steps-grid">
                <div 
                  *ngFor="let step of phase.steps; trackBy: trackByStep" 
                  class="step-item"
                >
                  <div class="step-number">{{ step.orderNo }}</div>
                  <div class="step-details">
                    <h4 class="step-name">{{ step.name }}</h4>
                    <p *ngIf="step.description" class="step-description">{{ step.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </div>

    </div>
  `,
  styles: [
    `
      .all-steps-page {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        color: #6b7280;
      }

      .breadcrumb-separator {
        margin: 0 8px;
        font-size: 18px;
      }

      .breadcrumb-current {
        font-weight: 500;
        color: #1f2937;
      }

      .page-header {
        margin-bottom: 32px;
      }

      .page-header h1 {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: #1f2937;
      }

      .subtitle {
        color: #6b7280;
        margin: 8px 0 0 0;
        font-size: 16px;
      }


      .phases-section {
        margin-bottom: 32px;
      }

      .phase-panel {
        border-radius: 12px !important;
        margin-bottom: 16px;
      }

      .phase-header {
        display: flex;
        align-items: center;
        gap: 16px;
        width: 100%;
      }

      .phase-link {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px !important;
        font-weight: 500 !important;
        text-transform: none !important;
        padding: 8px 16px !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
      }

      .phase-link:hover {
        background-color: rgba(var(--ff-primary-rgb), 0.1) !important;
        color: rgb(var(--ff-primary-rgb)) !important;
      }

      .step-count-chip {
        background-color: rgba(var(--ff-primary-rgb), 0.1) !important;
        color: rgb(var(--ff-primary-rgb)) !important;
        font-weight: 500 !important;
        margin-left: auto;
      }

      .phase-content {
        padding: 16px 0;
      }

      .steps-grid {
        display: grid;
        gap: 16px;
      }

      .step-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        background-color: #f9fafb;
        border-radius: 8px;
        border-left: 4px solid rgb(var(--ff-primary-rgb));
        transition: all 0.2s ease;
      }

      .step-item:hover {
        background-color: #f3f4f6;
        transform: translateX(4px);
      }

      .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: rgb(var(--ff-primary-rgb));
        color: white;
        border-radius: 50%;
        font-weight: 600;
        font-size: 14px;
        flex-shrink: 0;
      }

      .step-details {
        flex: 1;
      }

      .step-name {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 500;
        color: #1f2937;
      }

      .step-description {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }


      /* Responsive */
      @media (max-width: 768px) {
        .all-steps-page {
          padding: 16px;
        }

        .page-header h1 {
          font-size: 24px;
        }


        .phase-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }
    `,
  ],
})
export class AllStepsPageComponent implements OnInit {
  private router = inject(Router);

  // Search functionality
  searchTerm = signal('');

  // All phases with their steps
  allPhases = signal<PhaseWithSteps[]>([
    {
      id: 'planning',
      name: 'Planning',
      description: 'Comprehensive project planning including commercial, technical, and resource planning',
      orderNo: 1,
      stepCount: 12,
      steps: [
        { id: 'planning-1', name: 'Planning - Commercial', phaseId: 'planning', phaseName: 'Planning', orderNo: 1 },
        { id: 'planning-2', name: 'Wayleave Secured', phaseId: 'planning', phaseName: 'Planning', orderNo: 2 },
        { id: 'planning-3', name: 'BSS Signed', phaseId: 'planning', phaseName: 'Planning', orderNo: 3 },
        { id: 'planning-4', name: 'MSS Signed', phaseId: 'planning', phaseName: 'Planning', orderNo: 4 },
        { id: 'planning-5', name: 'PO Received', phaseId: 'planning', phaseName: 'Planning', orderNo: 5 },
        { id: 'planning-6', name: 'Planning - HLD', phaseId: 'planning', phaseName: 'Planning', orderNo: 6 },
        { id: 'planning-7', name: 'Planning - Splice Diagram', phaseId: 'planning', phaseName: 'Planning', orderNo: 7 },
        { id: 'planning-8', name: 'Planning - Backhaul', phaseId: 'planning', phaseName: 'Planning', orderNo: 8 },
        { id: 'planning-9', name: 'BOQ Finalized', phaseId: 'planning', phaseName: 'Planning', orderNo: 9 },
        { id: 'planning-10', name: 'Warehousing', phaseId: 'planning', phaseName: 'Planning', orderNo: 10 },
        { id: 'planning-11', name: 'Contractor Quotes', phaseId: 'planning', phaseName: 'Planning', orderNo: 11 },
        { id: 'planning-12', name: 'Supplier Quotes', phaseId: 'planning', phaseName: 'Planning', orderNo: 12 },
      ],
    },
    {
      id: 'initiate-project',
      name: 'Initiate Project (IP)',
      description: 'Project kickoff, resource allocation, and preparation activities',
      orderNo: 2,
      stepCount: 6,
      steps: [
        { id: 'ip-1', name: 'IP1: Project Kickoff', phaseId: 'initiate-project', phaseName: 'Initiate Project (IP)', orderNo: 1 },
        { id: 'ip-2', name: 'IP2: Resource Allocation', phaseId: 'initiate-project', phaseName: 'Initiate Project (IP)', orderNo: 2 },
        { id: 'ip-3', name: 'IP3: Site Preparation', phaseId: 'initiate-project', phaseName: 'Initiate Project (IP)', orderNo: 3 },
        { id: 'ip-4', name: 'IP4: Technical Validation', phaseId: 'initiate-project', phaseName: 'Initiate Project (IP)', orderNo: 4 },
        { id: 'ip-5', name: 'IP5: Contractor Mobilization', phaseId: 'initiate-project', phaseName: 'Initiate Project (IP)', orderNo: 5 },
        { id: 'ip-6', name: 'IP6: Quality Assurance Setup', phaseId: 'initiate-project', phaseName: 'Initiate Project (IP)', orderNo: 6 },
      ],
    },
    {
      id: 'work-in-progress',
      name: 'Work in Progress (WIP)',
      description: 'Active implementation including installation, configuration, and testing',
      orderNo: 3,
      stepCount: 6,
      steps: [
        { id: 'wip-1', name: 'WIP1: Site Mobilization', phaseId: 'work-in-progress', phaseName: 'Work in Progress (WIP)', orderNo: 1 },
        { id: 'wip-2', name: 'WIP2: Infrastructure Installation', phaseId: 'work-in-progress', phaseName: 'Work in Progress (WIP)', orderNo: 2 },
        { id: 'wip-3', name: 'WIP3: Network Configuration', phaseId: 'work-in-progress', phaseName: 'Work in Progress (WIP)', orderNo: 3 },
        { id: 'wip-4', name: 'WIP4: Testing and Commissioning', phaseId: 'work-in-progress', phaseName: 'Work in Progress (WIP)', orderNo: 4 },
        { id: 'wip-5', name: 'WIP5: Documentation', phaseId: 'work-in-progress', phaseName: 'Work in Progress (WIP)', orderNo: 5 },
        { id: 'wip-6', name: 'WIP6: Quality Control', phaseId: 'work-in-progress', phaseName: 'Work in Progress (WIP)', orderNo: 6 },
      ],
    },
    {
      id: 'handover',
      name: 'Handover (HOC)',
      description: 'System handover, documentation transfer, and knowledge transfer',
      orderNo: 4,
      stepCount: 6,
      steps: [
        { id: 'hoc-1', name: 'HOC1: Pre-Handover Testing', phaseId: 'handover', phaseName: 'Handover (HOC)', orderNo: 1 },
        { id: 'hoc-2', name: 'HOC2: Documentation Handover', phaseId: 'handover', phaseName: 'Handover (HOC)', orderNo: 2 },
        { id: 'hoc-3', name: 'HOC3: Knowledge Transfer', phaseId: 'handover', phaseName: 'Handover (HOC)', orderNo: 3 },
        { id: 'hoc-4', name: 'HOC4: Site Cleanup', phaseId: 'handover', phaseName: 'Handover (HOC)', orderNo: 4 },
        { id: 'hoc-5', name: 'HOC5: Formal Handover', phaseId: 'handover', phaseName: 'Handover (HOC)', orderNo: 5 },
        { id: 'hoc-6', name: 'HOC6: Post-Handover Support', phaseId: 'handover', phaseName: 'Handover (HOC)', orderNo: 6 },
      ],
    },
    {
      id: 'full-acceptance',
      name: 'Full Acceptance (FAC)',
      description: 'Final acceptance testing, issue resolution, and project closure',
      orderNo: 5,
      stepCount: 6,
      steps: [
        { id: 'fac-1', name: 'FAC1: Acceptance Period Monitoring', phaseId: 'full-acceptance', phaseName: 'Full Acceptance (FAC)', orderNo: 1 },
        { id: 'fac-2', name: 'FAC2: Final Testing', phaseId: 'full-acceptance', phaseName: 'Full Acceptance (FAC)', orderNo: 2 },
        { id: 'fac-3', name: 'FAC3: Issue Resolution', phaseId: 'full-acceptance', phaseName: 'Full Acceptance (FAC)', orderNo: 3 },
        { id: 'fac-4', name: 'FAC4: Documentation Finalization', phaseId: 'full-acceptance', phaseName: 'Full Acceptance (FAC)', orderNo: 4 },
        { id: 'fac-5', name: 'FAC5: Financial Closure', phaseId: 'full-acceptance', phaseName: 'Full Acceptance (FAC)', orderNo: 5 },
        { id: 'fac-6', name: 'FAC6: Project Closure', phaseId: 'full-acceptance', phaseName: 'Full Acceptance (FAC)', orderNo: 6 },
      ],
    },
  ]);

  // Filtered phases based on search
  filteredPhases = computed(() => {
    const phases = this.allPhases();
    const term = this.searchTerm().toLowerCase();

    if (!term) {
      return phases;
    }

    return phases.map(phase => ({
      ...phase,
      steps: phase.steps.filter(step => 
        step.name.toLowerCase().includes(term) ||
        step.description?.toLowerCase().includes(term)
      )
    })).filter(phase => phase.steps.length > 0);
  });

  ngOnInit() {
    // Component initialization
  }

  onSearchChange() {
    // Trigger computed signal recalculation
    // The computed signal will automatically update the filtered results
  }

  navigateHome() {
    this.router.navigate(['/']);
  }

  navigateToPhases(event: Event) {
    event.stopPropagation(); // Prevent expansion panel toggle
    this.router.navigate(['/phases']);
  }

  getTotalSteps(): number {
    return this.allPhases().reduce((total, phase) => total + phase.stepCount, 0);
  }

  getTotalFilteredSteps(): number {
    return this.filteredPhases().reduce((total, phase) => total + phase.steps.length, 0);
  }

  trackByPhase(index: number, phase: PhaseWithSteps): string {
    return phase.id;
  }

  trackByStep(index: number, step: StepData): string {
    return step.id;
  }
}