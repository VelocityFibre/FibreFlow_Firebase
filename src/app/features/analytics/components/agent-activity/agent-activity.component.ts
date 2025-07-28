import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AgentActivity } from '../../models/pole-report.model';

@Component({
  selector: 'app-agent-activity',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './agent-activity.component.html',
  styleUrls: ['./agent-activity.component.scss'],
})
export class AgentActivityComponent {
  @Input() set agents(value: AgentActivity[]) {
    this.agentActivities.set(value || []);
  }

  agentActivities = signal<AgentActivity[]>([]);

  displayedColumns = ['agent', 'actions', 'timespan', 'completion', 'lastActivity'];

  // Calculate agent statistics
  agentStats = computed(() => {
    const agents = this.agentActivities();
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.totalActions > 0).length;
    const totalActions = agents.reduce((sum, a) => sum + a.totalActions, 0);
    const avgActionsPerAgent = totalAgents > 0 ? Math.round(totalActions / totalAgents) : 0;

    // Find most active agent
    const mostActive = agents.reduce(
      (prev, current) => (current.totalActions > prev.totalActions ? current : prev),
      agents[0] || null,
    );

    return {
      totalAgents,
      activeAgents,
      totalActions,
      avgActionsPerAgent,
      mostActive: mostActive?.name || 'N/A',
    };
  });

  // Sort agents by activity level
  sortedAgents = computed(() => {
    return [...this.agentActivities()].sort((a, b) => b.totalActions - a.totalActions);
  });

  getActivityLevel(actions: number): string {
    if (actions >= 10) return 'High';
    if (actions >= 5) return 'Medium';
    if (actions >= 1) return 'Low';
    return 'None';
  }

  getActivityColor(actions: number): string {
    if (actions >= 10) return 'primary';
    if (actions >= 5) return 'accent';
    if (actions >= 1) return 'warn';
    return '';
  }

  getActivityIcon(actions: number): string {
    if (actions >= 10) return 'trending_up';
    if (actions >= 5) return 'trending_flat';
    if (actions >= 1) return 'trending_down';
    return 'remove';
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatTimespan(start?: string, end?: string): string {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Same day';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  }

  getCompletionRate(agent: AgentActivity): number {
    if (agent.totalActions === 0) return 0;
    const completedActions =
      agent.statusBreakdown
        ?.filter(
          (s) =>
            s.status.toLowerCase().includes('completed') ||
            s.status.toLowerCase().includes('approved'),
        )
        .reduce((sum, s) => sum + s.count, 0) || 0;

    return Math.round((completedActions / agent.totalActions) * 100);
  }

  viewAgentDetails(agent: AgentActivity) {
    // TODO: Implement agent details view
    console.log('View details for agent:', agent.name);
  }

  exportAgentData() {
    // TODO: Implement export functionality
    console.log('Export agent activity data');
  }
}
