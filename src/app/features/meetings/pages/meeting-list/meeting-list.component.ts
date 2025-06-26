import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MeetingService } from '../../services/meeting.service';
import { Meeting } from '../../models/meeting.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-meeting-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './meeting-list.component.html',
  styleUrl: './meeting-list.component.scss',
})
export class MeetingListComponent implements OnInit {
  private meetingService = inject(MeetingService);
  
  meetings$!: Observable<Meeting[]>;
  loading = false;

  ngOnInit() {
    this.loadMeetings();
  }

  loadMeetings() {
    this.loading = true;
    // Get meetings sorted by date (newest first)
    this.meetings$ = this.meetingService.getMeetings().pipe(
      map(meetings => meetings.sort((a, b) => {
        // Handle both date and dateTime fields
        const aDate = a.dateTime || (a as any).date;
        const bDate = b.dateTime || (b as any).date;
        
        const dateA = aDate instanceof Date ? aDate.getTime() : new Date(aDate).getTime();
        const dateB = bDate instanceof Date ? bDate.getTime() : new Date(bDate).getTime();
        return dateB - dateA; // Newest first
      }))
    );
    
    // Set loading to false after observable is set up
    this.meetings$.subscribe(() => {
      this.loading = false;
    });
  }
}