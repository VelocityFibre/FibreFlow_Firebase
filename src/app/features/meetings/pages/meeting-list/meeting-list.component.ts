import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-meeting-list',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Meetings</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Meeting list will be implemented here</p>
      </mat-card-content>
    </mat-card>
  `,
})
export class MeetingListComponent {}