import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { LoadingSkeletonComponent } from '../../../../../shared/components/loading-skeleton/loading-skeleton.component';

@Component({
  selector: 'app-pole-analytics',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    PageHeaderComponent,
    LoadingSkeletonComponent,
  ],
  templateUrl: './pole-analytics.component.html',
  styleUrl: './pole-analytics.component.scss',
})
export class PoleAnalyticsComponent {
  private router = inject(Router);

  headerActions = [
    {
      label: 'New Analysis',
      icon: 'add',
      color: 'primary' as const,
      action: () => this.startNewAnalysis(),
    },
  ];

  features = [
    {
      title: 'Upload Data',
      description: 'Upload OneMap CSV files for processing',
      icon: 'cloud_upload',
      route: 'upload',
      color: 'primary',
    },
    {
      title: 'Process Data',
      description: 'Filter and analyze pole permission status',
      icon: 'analytics',
      route: 'process',
      color: 'accent',
    },
    {
      title: 'Generate Reports',
      description: 'Create time-based analytics and exports',
      icon: 'assessment',
      route: 'reports',
      color: 'primary',
    },
    {
      title: 'View History',
      description: 'Access previous analysis sessions',
      icon: 'history',
      route: 'history',
      color: 'accent',
      disabled: true,
    },
  ];

  stats = [
    { label: 'Total Poles Analyzed', value: '3,732', icon: 'location_on' },
    { label: 'Last Analysis', value: 'Today', icon: 'schedule' },
    { label: 'Reports Generated', value: '12', icon: 'description' },
    { label: 'Data Quality', value: '95%', icon: 'verified' },
  ];

  startNewAnalysis(): void {
    this.router.navigate(['/analytics/pole-permissions/upload']);
  }
}
