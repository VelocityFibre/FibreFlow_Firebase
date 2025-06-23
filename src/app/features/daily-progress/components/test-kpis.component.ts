import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-test-kpis',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div style="padding: 24px;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>✅ KPI Route Test Working!</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>This simple component loads successfully.</p>
          <p>The issue was with the original KPI component, not the routing.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class TestKpisComponent {}
