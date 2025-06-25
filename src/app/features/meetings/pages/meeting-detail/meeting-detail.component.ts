import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-meeting-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Meeting Detail</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Meeting detail will be implemented here</p>
      </mat-card-content>
    </mat-card>
  `,
})
export class MeetingDetailComponent {}