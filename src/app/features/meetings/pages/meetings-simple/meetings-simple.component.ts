import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-meetings-simple',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="ff-page">
      <!-- Page Header -->
      <header class="ff-page-header">
        <div class="ff-page-header-content">
          <h1 class="ff-page-title">Meeting Notes</h1>
          <p class="ff-page-subtitle">Your recorded meetings from Fireflies</p>
        </div>
      </header>

      <!-- Loading State -->
      <div *ngIf="loading" class="ff-loading">
        <div class="ff-spinner"></div>
        <p class="ff-loading-text">Loading meetings...</p>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="!loading && meetings.length === 0" class="ff-empty-state">
        <mat-icon class="ff-empty-icon">videocam_off</mat-icon>
        <h3 class="ff-empty-title">No meetings found</h3>
        <p class="ff-empty-text">Your synced meetings will appear here</p>
      </div>
      
      <!-- Meetings Grid -->
      <div *ngIf="!loading && meetings.length > 0" class="ff-content">
        <div class="ff-meetings-grid">
          <article 
            *ngFor="let meeting of meetings" 
            class="ff-meeting-card"
            [routerLink]="['/meetings', meeting.id]"
            tabindex="0">
            
            <!-- Card Header -->
            <div class="ff-card-header">
              <h2 class="ff-card-title">{{ meeting.title }}</h2>
              <time class="ff-card-date">
                <mat-icon class="ff-icon-sm">calendar_today</mat-icon>
                {{ formatDate(meeting.date) }}
              </time>
            </div>

            <!-- Card Meta -->
            <div class="ff-card-meta">
              <span class="ff-meta-item">
                <mat-icon class="ff-icon-sm">schedule</mat-icon>
                {{ Math.round(meeting.duration) }} min
              </span>
              <span class="ff-meta-item">
                <mat-icon class="ff-icon-sm">task_alt</mat-icon>
                {{ meeting.actionItems?.length || 0 }} Action Items
              </span>
            </div>

            <!-- Card Summary -->
            <div class="ff-card-summary" *ngIf="meeting.summary">
              <p>{{ meeting.summary }}</p>
            </div>

            <!-- Card Footer -->
            <div class="ff-card-footer">
              <span class="ff-badge ff-badge-primary">
                <mat-icon class="ff-icon-xs">cloud_done</mat-icon>
                Synced
              </span>
              <mat-icon class="ff-card-arrow">arrow_forward</mat-icon>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./meetings-simple.component.scss']
})
export class MeetingsSimpleComponent implements OnInit {
  private firestore = inject(Firestore);
  
  meetings: any[] = [];
  loading = true;
  Math = Math; // Make Math available in template

  async ngOnInit() {
    await this.loadMeetings();
  }

  async loadMeetings() {
    try {
      const meetingsRef = collection(this.firestore, 'meetings');
      const snapshot = await getDocs(meetingsRef);
      
      this.meetings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by date (newest first)
      this.meetings.sort((a, b) => {
        const dateA = this.getDate(a.date);
        const dateB = this.getDate(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('Loaded meetings:', this.meetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      this.loading = false;
    }
  }

  getDate(date: any): Date {
    if (!date) return new Date();
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
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
}