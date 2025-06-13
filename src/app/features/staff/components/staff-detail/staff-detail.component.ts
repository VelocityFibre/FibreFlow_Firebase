import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
  ],
  template: `
    <div class="staff-detail-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Staff Profile</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="Overview">
              <p>Staff overview - Coming soon!</p>
            </mat-tab>
            <mat-tab label="Availability">
              <p>Availability calendar - Coming soon!</p>
            </mat-tab>
            <mat-tab label="Projects">
              <p>Assigned projects - Coming soon!</p>
            </mat-tab>
            <mat-tab label="Tasks">
              <p>Assigned tasks - Coming soon!</p>
            </mat-tab>
            <mat-tab label="Activity">
              <p>Activity history - Coming soon!</p>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button routerLink="/staff">
            <mat-icon>arrow_back</mat-icon>
            Back to List
          </button>
          <button mat-raised-button color="primary">
            <mat-icon>edit</mat-icon>
            Edit Profile
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .staff-detail-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      mat-tab-group {
        margin-top: 24px;
      }
    `,
  ],
})
export class StaffDetailComponent {}
