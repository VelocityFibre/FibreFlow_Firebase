import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Observable } from 'rxjs';

import { DashboardMockService } from '../../services/dashboard-mock.service';
import { DashboardMetrics, ModuleCard, AlertSeverity } from '../../models/dashboard.models';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss']
})
export class MainDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardMockService);
  
  metrics$!: Observable<DashboardMetrics>;
  moduleCards$!: Observable<ModuleCard[]>;
  
  ngOnInit() {
    this.metrics$ = this.dashboardService.getDashboardMetrics();
    this.moduleCards$ = this.dashboardService.getModuleCards();
  }
  
  getAlertSeverityClass(severity: AlertSeverity): string {
    const severityClasses = {
      [AlertSeverity.CRITICAL]: 'alert-critical',
      [AlertSeverity.HIGH]: 'alert-high',
      [AlertSeverity.MEDIUM]: 'alert-medium',
      [AlertSeverity.LOW]: 'alert-low'
    };
    return severityClasses[severity] || '';
  }
  
  getAlertIcon(severity: AlertSeverity): string {
    const icons = {
      [AlertSeverity.CRITICAL]: 'error',
      [AlertSeverity.HIGH]: 'warning',
      [AlertSeverity.MEDIUM]: 'info',
      [AlertSeverity.LOW]: 'info_outline'
    };
    return icons[severity] || 'info';
  }
  
  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'project_created': 'add_circle',
      'project_completed': 'check_circle',
      'task_completed': 'task_alt',
      'pole_planted': 'cell_tower',
      'issue_resolved': 'done',
      'staff_assigned': 'person_add'
    };
    return icons[type] || 'circle';
  }
  
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / 60000);
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  }
}