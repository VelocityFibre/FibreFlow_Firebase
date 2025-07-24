import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { ConnectedDrop } from '../../models/pole-report.model';

@Component({
  selector: 'app-connected-drops',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule
  ],
  templateUrl: './connected-drops.component.html',
  styleUrls: ['./connected-drops.component.scss']
})
export class ConnectedDropsComponent {
  @Input() set drops(value: ConnectedDrop[]) {
    this.connectedDrops.set(value || []);
  }

  connectedDrops = signal<ConnectedDrop[]>([]);
  
  displayedColumns = ['dropNumber', 'address', 'status', 'agent', 'lastUpdate', 'actions'];
  
  // Group drops by status for better organization
  dropsByStatus = computed(() => {
    const drops = this.connectedDrops();
    const grouped = new Map<string, ConnectedDrop[]>();
    
    drops.forEach(drop => {
      const status = drop.status || 'Unknown';
      if (!grouped.has(status)) {
        grouped.set(status, []);
      }
      grouped.get(status)!.push(drop);
    });
    
    return Array.from(grouped.entries()).map(([status, drops]) => ({
      status,
      count: drops.length,
      drops: drops.sort((a, b) => (a.dropNumber || '').localeCompare(b.dropNumber || ''))
    }));
  });

  // Summary statistics
  dropStats = computed(() => {
    const drops = this.connectedDrops();
    const total = drops.length;
    const completed = drops.filter(d => d.status?.toLowerCase().includes('completed')).length;
    const inProgress = drops.filter(d => d.status?.toLowerCase().includes('progress')).length;
    const pending = drops.filter(d => !d.status || d.status.toLowerCase().includes('pending')).length;
    
    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  getStatusIcon(status: string): string {
    if (status.toLowerCase().includes('completed')) return 'check_circle';
    if (status.toLowerCase().includes('progress')) return 'pending';
    if (status.toLowerCase().includes('scheduled')) return 'schedule';
    if (status.toLowerCase().includes('cancelled')) return 'cancel';
    return 'info';
  }

  getStatusColor(status: string): string {
    if (status.toLowerCase().includes('completed')) return 'primary';
    if (status.toLowerCase().includes('progress')) return 'accent';
    if (status.toLowerCase().includes('scheduled')) return 'warn';
    if (status.toLowerCase().includes('cancelled')) return 'warn';
    return '';
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  viewDropDetails(drop: ConnectedDrop) {
    // TODO: Implement drop details view or navigation
    console.log('View details for drop:', drop.dropNumber);
  }

  exportDrops() {
    // TODO: Implement export functionality
    console.log('Export connected drops data');
  }
}