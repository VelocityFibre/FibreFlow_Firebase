import {
  Component,
  Input,
  OnInit,
  inject,
  computed,
  signal,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { PoleTrackerService } from '@app/features/pole-tracker/services/pole-tracker.service';
import { ProjectService } from '@app/core/services/project.service';
import { PoleTrackerStats, PoleType } from '@app/features/pole-tracker/models/pole-tracker.model';
import { Project } from '@app/core/models/project.model';
import { Subject, takeUntil, switchMap, of, interval, startWith } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-pole-installation-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './pole-installation-widget.component.html',
  styleUrl: './pole-installation-widget.component.scss',
})
export class PoleInstallationWidgetComponent implements OnInit, OnDestroy {
  @Input() projectId?: string;
  @Input() refreshInterval = 30000; // 30 seconds default
  @Input() showProjectSelector = true;

  private readonly destroy$ = new Subject<void>();
  private readonly poleTrackerService = inject(PoleTrackerService);
  private readonly projectService = inject(ProjectService);

  // Signals for reactive state
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<PoleTrackerStats | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly selectedProjectId = signal<string | null>(null);

  // Computed values
  readonly currentStats = computed(() => this.stats());
  readonly hasData = computed(() => !this.loading() && !this.error() && !!this.stats());

  // Chart instance
  private chartInstance?: Chart;

  ngOnInit(): void {
    this.loadProjects();
    this.setupDataRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  private loadProjects(): void {
    this.projectService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects.set(projects.filter((p) => p.status === 'active'));

          // Set initial project
          if (this.projectId) {
            this.selectedProjectId.set(this.projectId);
          } else if (projects.length > 0) {
            this.selectedProjectId.set(projects[0].id!);
          }
        },
        error: (err) => {
          console.error('Failed to load projects:', err);
          this.error.set('Failed to load projects');
        },
      });
  }

  private setupDataRefresh(): void {
    // Watch for project changes and refresh data
    effect(() => {
      const projectId = this.selectedProjectId();
      if (projectId) {
        this.loadStats(projectId);
      }
    });

    // Set up periodic refresh
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        takeUntil(this.destroy$),
        switchMap(() => {
          const projectId = this.selectedProjectId();
          return projectId ? of(projectId) : of(null);
        }),
      )
      .subscribe((projectId) => {
        if (projectId) {
          this.loadStats(projectId);
        }
      });
  }

  private loadStats(projectId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.poleTrackerService
      .getPoleTrackerStats(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.loading.set(false);
          this.updateChart(stats);
        },
        error: (err) => {
          console.error('Failed to load pole statistics:', err);
          this.error.set('Failed to load statistics');
          this.loading.set(false);
        },
      });
  }

  onProjectChange(projectId: string): void {
    this.selectedProjectId.set(projectId);
  }

  private updateChart(stats: PoleTrackerStats): void {
    const canvas = document.getElementById('pole-chart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Prepare data for the chart
    const poleTypes = Object.keys(stats.polesByType) as PoleType[];
    const poleTypeCounts = poleTypes.map((type) => stats.polesByType[type] || 0);

    // Get CSS variables for theming
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = `rgb(${computedStyle.getPropertyValue('--ff-primary').trim()})`;
    const secondaryColor = `rgb(${computedStyle.getPropertyValue('--ff-secondary').trim()})`;
    const successColor = `rgb(${computedStyle.getPropertyValue('--ff-success').trim()})`;
    const warningColor = `rgb(${computedStyle.getPropertyValue('--ff-warning').trim()})`;
    const textColor = `rgb(${computedStyle.getPropertyValue('--ff-foreground').trim()})`;

    const chartConfig: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: poleTypes.map((type) => this.formatPoleType(type)),
        datasets: [
          {
            data: poleTypeCounts,
            backgroundColor: [primaryColor, secondaryColor, successColor, warningColor],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              padding: 12,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: `rgba(${computedStyle.getPropertyValue('--ff-card').trim()}, 0.9)`,
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: `rgb(${computedStyle.getPropertyValue('--ff-border').trim()})`,
            borderWidth: 1,
          },
        },
      },
    };

    this.chartInstance = new Chart(ctx, chartConfig);
  }

  private formatPoleType(type: PoleType): string {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  getInstallationIcon(): string {
    const progress = this.currentStats()?.installationProgress || 0;
    if (progress === 100) return 'check_circle';
    if (progress >= 75) return 'trending_up';
    if (progress >= 50) return 'timeline';
    return 'construction';
  }

  getProgressColor(): string {
    const progress = this.currentStats()?.installationProgress || 0;
    if (progress === 100) return 'success';
    if (progress >= 75) return 'primary';
    if (progress >= 50) return 'accent';
    return 'warn';
  }
}
