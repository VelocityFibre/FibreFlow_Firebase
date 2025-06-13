import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-project-stock',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-content>
        <p>Project stock allocations will be displayed here.</p>
      </mat-card-content>
    </mat-card>
  `,
})
export class ProjectStockComponent {
  @Input() projectId!: string;
}
