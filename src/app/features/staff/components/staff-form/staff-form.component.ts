import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="staff-form-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Staff Form</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Staff form component - Coming soon!</p>
          <p>This will be a multi-step form for creating and editing staff members.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button routerLink="/staff">
            <mat-icon>arrow_back</mat-icon>
            Back to List
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .staff-form-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
  `]
})
export class StaffFormComponent {}