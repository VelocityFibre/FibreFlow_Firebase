import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-meeting-detail-simple',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="ff-page">
      <!-- Page Header -->
      <header class="ff-page-header">
        <div class="ff-page-header-content">
          <button mat-icon-button routerLink="/meetings" class="ff-back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="ff-header-text">
            <h1 class="ff-page-title">{{ meeting?.title || 'Loading...' }}</h1>
            <p class="ff-page-subtitle" *ngIf="meeting">
              <mat-icon class="ff-icon-sm">calendar_today</mat-icon>
              {{ formatDate(meeting.date) }} • {{ Math.round(meeting.duration) }} minutes
            </p>
          </div>
        </div>
      </header>

      <!-- Loading State -->
      <div *ngIf="loading" class="ff-loading">
        <div class="ff-spinner"></div>
        <p class="ff-loading-text">Loading meeting details...</p>
      </div>

      <!-- Meeting Content -->
      <div *ngIf="!loading && meeting" class="ff-content">
        
        <!-- Summary Section -->
        <section class="ff-section">
          <h2 class="ff-section-title">
            <mat-icon class="ff-icon-md">summarize</mat-icon>
            Summary
          </h2>
          <div class="ff-card">
            <p class="ff-summary-text">{{ meeting.summary || 'No summary available' }}</p>
          </div>
        </section>

        <!-- Participants Section -->
        <section class="ff-section">
          <h2 class="ff-section-title">
            <mat-icon class="ff-icon-md">group</mat-icon>
            Participants ({{ meeting.participants?.length || 0 }})
          </h2>
          <div class="ff-card">
            <div class="ff-participants-list">
              <div *ngFor="let participant of meeting.participants" class="ff-participant">
                <div class="ff-participant-avatar">
                  {{ getInitials(participant.name) }}
                </div>
                <div class="ff-participant-info">
                  <p class="ff-participant-name">{{ participant.name }}</p>
                  <p class="ff-participant-email">{{ participant.email }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Action Items Section -->
        <section class="ff-section">
          <h2 class="ff-section-title">
            <mat-icon class="ff-icon-md">task_alt</mat-icon>
            Action Items ({{ meeting.actionItems?.length || 0 }})
          </h2>
          <div class="ff-card" *ngIf="meeting.actionItems && meeting.actionItems.length > 0">
            <div class="ff-action-items">
              <div *ngFor="let item of meeting.actionItems; let i = index" class="ff-action-item">
                <span class="ff-action-number">{{ i + 1 }}</span>
                <p class="ff-action-text">{{ item.text }}</p>
              </div>
            </div>
          </div>
          <div class="ff-card ff-empty-card" *ngIf="!meeting.actionItems || meeting.actionItems.length === 0">
            <p>No action items from this meeting</p>
          </div>
        </section>

        <!-- Transcript Section -->
        <section class="ff-section">
          <h2 class="ff-section-title">
            <mat-icon class="ff-icon-md">description</mat-icon>
            Full Transcript
          </h2>
          <div class="ff-card">
            <p class="ff-transcript-notice">
              <mat-icon class="ff-icon-sm">info</mat-icon>
              Transcript feature coming soon. Visit 
              <a [href]="meeting.transcriptUrl" target="_blank" rel="noopener" *ngIf="meeting.transcriptUrl">
                Fireflies <mat-icon class="ff-icon-xs">open_in_new</mat-icon>
              </a>
              to view the full transcript.
            </p>
          </div>
        </section>

      </div>

      <!-- Error State -->
      <div *ngIf="!loading && !meeting" class="ff-error">
        <mat-icon class="ff-error-icon">error_outline</mat-icon>
        <h3>Meeting not found</h3>
        <button mat-button routerLink="/meetings">Back to Meetings</button>
      </div>
    </div>
  `,
  styleUrls: ['./meeting-detail-simple.component.scss']
})
export class MeetingDetailSimpleComponent implements OnInit {
  private firestore = inject(Firestore);
  private route = inject(ActivatedRoute);
  
  meeting: any = null;
  loading = true;
  Math = Math;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadMeeting(id);
    }
  }

  async loadMeeting(id: string) {
    try {
      const meetingRef = doc(this.firestore, 'meetings', id);
      const meetingSnap = await getDoc(meetingRef);
      
      if (meetingSnap.exists()) {
        this.meeting = {
          id: meetingSnap.id,
          ...meetingSnap.data()
        };
        console.log('Loaded meeting:', this.meeting);
      }
    } catch (error) {
      console.error('Error loading meeting:', error);
    } finally {
      this.loading = false;
    }
  }

  formatDate(date: any): string {
    const d = this.getDate(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getDate(date: any): Date {
    if (!date) return new Date();
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}