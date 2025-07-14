import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Project, ProjectKPITargets } from '../../../../core/models/project.model';

interface TimelineItem {
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  icon: string;
  position: { left: string; width: string };
  isActive: boolean;
  progress: number;
}

@Component({
  selector: 'app-project-kpi-timeline',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-card *ngIf="project?.metadata?.kpiTargets">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>timeline</mat-icon>
          KPI Timeline Overview
        </mat-card-title>
        <mat-card-subtitle>Visual representation of KPI phases and dependencies</mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <!-- Timeline Container -->
        <div class="timeline-container">
          <!-- Month Headers -->
          <div class="month-headers">
            <div class="month-header" *ngFor="let month of months" [style.width]="month.width">
              {{ month.label }}
            </div>
          </div>
          
          <!-- Timeline Bars -->
          <div class="timeline-bars">
            <div 
              class="timeline-item" 
              *ngFor="let item of timelineItems"
              [class.active]="item.isActive"
              [matTooltip]="getTooltip(item)">
              
              <div class="item-label">
                <mat-icon>{{ item.icon }}</mat-icon>
                <span>{{ item.name }}</span>
              </div>
              
              <div class="item-bar-container">
                <div 
                  class="item-bar" 
                  [style.left]="item.position.left"
                  [style.width]="item.position.width"
                  [style.background-color]="item.color">
                  
                  <div 
                    class="progress-fill" 
                    [style.width.%]="item.progress"
                    [style.background-color]="getDarkerColor(item.color)">
                  </div>
                  
                  <span class="progress-text" *ngIf="item.progress > 10">
                    {{ item.progress }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Today Marker -->
          <div class="today-marker" [style.left]="todayPosition">
            <div class="marker-line"></div>
            <div class="marker-label">Today</div>
          </div>
        </div>
        
        <!-- Legend -->
        <div class="timeline-legend">
          <div class="legend-item" *ngFor="let item of legendItems">
            <div class="legend-color" [style.background-color]="item.color"></div>
            <span>{{ item.label }}</span>
          </div>
        </div>
        
        <!-- Phase Dependencies -->
        <div class="dependencies-info">
          <h4>Dependencies & Sequencing</h4>
          <div class="dependency-list">
            <div class="dependency-item">
              <mat-icon>arrow_forward</mat-icon>
              <span>Pole Permissions → Poles Planted (7 days delay)</span>
            </div>
            <div class="dependency-item">
              <mat-icon>arrow_forward</mat-icon>
              <span>Poles Planted → Fibre Stringing (14 days delay)</span>
            </div>
            <div class="dependency-item">
              <mat-icon>info</mat-icon>
              <span>Home Signups & Trenching can start immediately</span>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    mat-card-header {
      margin-bottom: 24px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .timeline-container {
      position: relative;
      margin: 24px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      overflow-x: auto;
      min-height: 300px;
    }

    .month-headers {
      display: flex;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 20px;
      min-width: 800px;
    }

    .month-header {
      text-align: center;
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
    }

    .timeline-bars {
      position: relative;
      min-width: 800px;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      height: 40px;
    }

    .timeline-item.active {
      opacity: 1;
    }

    .item-label {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 150px;
      font-size: 14px;
      color: #374151;
    }

    .item-label mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #6b7280;
    }

    .item-bar-container {
      position: relative;
      flex: 1;
      height: 32px;
    }

    .item-bar {
      position: absolute;
      height: 100%;
      border-radius: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .progress-fill {
      height: 100%;
      border-radius: 16px 0 0 16px;
      transition: width 0.3s ease;
    }

    .progress-text {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 12px;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .today-marker {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
    }

    .marker-line {
      position: absolute;
      top: 40px;
      bottom: 20px;
      width: 2px;
      background: #ef4444;
      box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
    }

    .marker-label {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ef4444;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .timeline-legend {
      display: flex;
      gap: 24px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #6b7280;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }

    .dependencies-info {
      margin-top: 24px;
      padding: 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
    }

    .dependencies-info h4 {
      font-size: 14px;
      font-weight: 500;
      color: #1e40af;
      margin: 0 0 12px 0;
    }

    .dependency-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dependency-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #3730a3;
    }

    .dependency-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2563eb;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .timeline-container {
        padding: 12px;
      }

      .item-label {
        width: 120px;
        font-size: 12px;
      }

      .timeline-legend {
        flex-wrap: wrap;
        gap: 12px;
      }
    }
  `]
})
export class ProjectKpiTimelineComponent implements OnInit {
  @Input() project!: Project;
  @Input() currentProgress?: { [key: string]: number };

  timelineItems: TimelineItem[] = [];
  months: { label: string; width: string }[] = [];
  todayPosition = '50%';
  legendItems = [
    { label: 'Pole Permissions', color: '#3B82F6' },
    { label: 'Home Signups', color: '#10B981' },
    { label: 'Poles Planted', color: '#F59E0B' },
    { label: 'Fibre Stringing', color: '#8B5CF6' },
    { label: 'Trenching', color: '#EF4444' }
  ];

  ngOnInit() {
    if (this.project?.metadata?.kpiTargets) {
      this.generateTimelineItems();
      this.calculateMonths();
      this.calculateTodayPosition();
    }
  }

  private generateTimelineItems() {
    const targets = this.project.metadata!.kpiTargets!;
    const projectStart = new Date(this.project.startDate as any);
    const projectEnd = targets.estimatedEndDate || new Date(this.project.expectedEndDate as any);
    const totalDuration = this.getDaysBetween(projectStart, projectEnd);

    this.timelineItems = [
      this.createTimelineItem('Pole Permissions', targets.polePermissions, projectStart, totalDuration, '#3B82F6', 'assignment'),
      this.createTimelineItem('Home Signups', targets.homeSignups, projectStart, totalDuration, '#10B981', 'home'),
      this.createTimelineItem('Poles Planted', targets.polesPlanted, projectStart, totalDuration, '#F59E0B', 'vertical_split'),
      this.createTimelineItem('Fibre Stringing', targets.fibreStringing, projectStart, totalDuration, '#8B5CF6', 'cable'),
      this.createTimelineItem('Trenching', targets.trenchingMeters, projectStart, totalDuration, '#EF4444', 'construction')
    ];
  }

  private createTimelineItem(
    name: string,
    kpiTarget: any,
    projectStart: Date,
    totalDuration: number,
    color: string,
    icon: string
  ): TimelineItem {
    const startDate = kpiTarget.estimatedStartDate || projectStart;
    const endDate = kpiTarget.estimatedEndDate || new Date();
    const startOffset = this.getDaysBetween(projectStart, startDate);
    const duration = this.getDaysBetween(startDate, endDate);

    const left = (startOffset / totalDuration) * 100;
    const width = (duration / totalDuration) * 100;

    const progress = this.currentProgress?.[name.toLowerCase().replace(' ', '')] || 0;

    return {
      name,
      startDate,
      endDate,
      color,
      icon,
      position: { left: `${left}%`, width: `${width}%` },
      isActive: new Date() >= startDate,
      progress
    };
  }

  private calculateMonths() {
    const projectStart = new Date(this.project.startDate as any);
    const projectEnd = this.project.metadata!.kpiTargets!.estimatedEndDate || new Date(this.project.expectedEndDate as any);
    
    const months: { label: string; width: string }[] = [];
    const current = new Date(projectStart);
    current.setDate(1);

    while (current <= projectEnd) {
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthStart = current > projectStart ? current : projectStart;
      const monthEnd = nextMonth > projectEnd ? projectEnd : nextMonth;
      
      const daysInMonth = this.getDaysBetween(monthStart, monthEnd);
      const totalDays = this.getDaysBetween(projectStart, projectEnd);
      const width = (daysInMonth / totalDays) * 100;

      months.push({
        label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        width: `${width}%`
      });

      current.setMonth(current.getMonth() + 1);
    }

    this.months = months;
  }

  private calculateTodayPosition() {
    const projectStart = new Date(this.project.startDate as any);
    const projectEnd = this.project.metadata!.kpiTargets!.estimatedEndDate || new Date(this.project.expectedEndDate as any);
    const today = new Date();

    if (today < projectStart) {
      this.todayPosition = '0%';
    } else if (today > projectEnd) {
      this.todayPosition = '100%';
    } else {
      const elapsed = this.getDaysBetween(projectStart, today);
      const total = this.getDaysBetween(projectStart, projectEnd);
      this.todayPosition = `${(elapsed / total) * 100}%`;
    }
  }

  private getDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDarkerColor(color: string): string {
    // Simple darkening - in production you'd use a proper color library
    const colorMap: { [key: string]: string } = {
      '#3B82F6': '#2563EB',
      '#10B981': '#059669',
      '#F59E0B': '#D97706',
      '#8B5CF6': '#7C3AED',
      '#EF4444': '#DC2626'
    };
    return colorMap[color] || color;
  }

  getTooltip(item: TimelineItem): string {
    return `${item.name}: ${item.startDate.toLocaleDateString()} - ${item.endDate.toLocaleDateString()} (${item.progress}% complete)`;
  }
}