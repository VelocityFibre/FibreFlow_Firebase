import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PoleTimelineEvent } from '../../models/pole-report.model';

@Component({
  selector: 'app-pole-timeline',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './pole-timeline.component.html',
  styleUrls: ['./pole-timeline.component.scss']
})
export class PoleTimelineComponent {
  @Input() set timeline(value: PoleTimelineEvent[]) {
    this.timelineEvents.set(value || []);
  }

  timelineEvents = signal<PoleTimelineEvent[]>([]);
  
  displayedColumns = ['date', 'status', 'drop', 'agent', 'details'];
  
  // Group events by date for better visualization
  groupedEvents = computed(() => {
    const events = this.timelineEvents();
    const grouped = new Map<string, PoleTimelineEvent[]>();
    
    events.forEach(event => {
      const dateKey = event.date.split('T')[0]; // Get just the date part
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });
    
    return Array.from(grouped.entries()).map(([date, events]) => ({
      date,
      events: events.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    }));
  });

  getStatusIcon(status: string): string {
    if (status.toLowerCase().includes('approved')) return 'check_circle';
    if (status.toLowerCase().includes('progress')) return 'pending';
    if (status.toLowerCase().includes('scheduled')) return 'schedule';
    if (status.toLowerCase().includes('completed')) return 'task_alt';
    return 'info';
  }

  getStatusColor(status: string): string {
    if (status.toLowerCase().includes('approved')) return 'primary';
    if (status.toLowerCase().includes('progress')) return 'accent';
    if (status.toLowerCase().includes('scheduled')) return 'warn';
    if (status.toLowerCase().includes('completed')) return 'success';
    return '';
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatTime(time?: string): string {
    if (!time) return '';
    return time.split('.')[0]; // Remove milliseconds
  }
}