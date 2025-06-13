import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <mat-card>
        <mat-card-content>
          <p>Admin features coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 24px;
    }
  `]
})
export class AdminDashboardComponent {}