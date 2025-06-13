import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, switchMap } from 'rxjs';
import { DailyProgress } from '../../models/daily-progress.model';
import { DailyProgressService } from '../../services/daily-progress.service';
import { DateFormatService } from '../../../../core/services/date-format.service';

@Component({
  selector: 'app-daily-progress-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="daily-progress-detail" *ngIf="progress$ | async as progress; else loading">
      <div class="detail-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Daily Progress Report</h1>
        <div class="header-actions">
          <button mat-button (click)="edit()" *ngIf="progress.status === 'draft'">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
          <button
            mat-raised-button
            color="accent"
            (click)="submitForApproval()"
            *ngIf="progress.status === 'draft'"
          >
            <mat-icon>send</mat-icon>
            Submit for Approval
          </button>
          <button
            mat-raised-button
            color="primary"
            (click)="approve()"
            *ngIf="progress.status === 'submitted' && canApprove"
          >
            <mat-icon>check_circle</mat-icon>
            Approve
          </button>
        </div>
      </div>

      <mat-card class="ff-card-daily-progress">
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <label>Date</label>
              <p>{{ formatDate(progress.date) }}</p>
            </div>
            <div class="info-item">
              <label>Project</label>
              <p>{{ progress.projectName || 'N/A' }}</p>
            </div>
            <div class="info-item">
              <label>Phase</label>
              <p>{{ progress.phaseName || '-' }}</p>
            </div>
            <div class="info-item">
              <label>Task</label>
              <p>{{ progress.taskName || '-' }}</p>
            </div>
            <div class="info-item">
              <label>Hours Worked</label>
              <p>{{ progress.hoursWorked }} hours</p>
            </div>
            <div class="info-item">
              <label>Weather</label>
              <p>{{ progress.weather || '-' }}</p>
            </div>
            <div class="info-item">
              <label>Status</label>
              <mat-chip [color]="getStatusColor(progress.status)" selected>
                {{ progress.status | titlecase }}
              </mat-chip>
            </div>
            <div class="info-item">
              <label>Submitted By</label>
              <p>{{ progress.submittedByName || '-' }}</p>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="section">
            <h3>Description</h3>
            <p>{{ progress.description }}</p>
          </div>

          <div class="section">
            <h3>Work Completed</h3>
            <p class="multiline">{{ progress.workCompleted }}</p>
          </div>

          <div class="section" *ngIf="progress.materialsUsed && progress.materialsUsed.length > 0">
            <h3>Materials Used</h3>
            <mat-list>
              <mat-list-item *ngFor="let material of progress.materialsUsed">
                <span matListItemTitle>{{ material.materialName }}</span>
                <span matListItemLine>{{ material.quantity }} {{ material.unit }}</span>
              </mat-list-item>
            </mat-list>
          </div>

          <div class="section" *ngIf="progress.issuesEncountered">
            <h3>Issues Encountered</h3>
            <p class="multiline issues">{{ progress.issuesEncountered }}</p>
          </div>

          <div class="section" *ngIf="progress.nextSteps">
            <h3>Next Steps</h3>
            <p class="multiline">{{ progress.nextSteps }}</p>
          </div>

          <div class="section">
            <h3>Staff Members</h3>
            <mat-chip-set>
              <mat-chip *ngFor="let name of progress.staffNames">
                {{ name }}
              </mat-chip>
            </mat-chip-set>
          </div>

          <div class="section" *ngIf="progress.contractorName">
            <h3>Contractor</h3>
            <p>{{ progress.contractorName }}</p>
          </div>

          <mat-divider></mat-divider>

          <div class="section">
            <h3>Comments</h3>
            <div class="comments-section">
              <div class="comment" *ngFor="let comment of progress.comments">
                <div class="comment-header">
                  <strong>{{ comment.authorName }}</strong>
                  <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                </div>
                <p>{{ comment.text }}</p>
              </div>
              <div class="no-comments" *ngIf="!progress.comments || progress.comments.length === 0">
                No comments yet
              </div>
            </div>

            <div class="add-comment">
              <mat-form-field appearance="fill">
                <mat-label>Add a comment</mat-label>
                <textarea matInput [(ngModel)]="newComment" rows="3"></textarea>
              </mat-form-field>
              <button
                mat-raised-button
                color="primary"
                (click)="addComment()"
                [disabled]="!newComment.trim()"
              >
                Post Comment
              </button>
            </div>
          </div>

          <div class="approval-info" *ngIf="progress.status === 'approved'">
            <mat-icon>check_circle</mat-icon>
            <div>
              <p>Approved by {{ progress.approvedByName }}</p>
              <p class="date">{{ progress.approvedAt ? formatDate(progress.approvedAt) : '' }}</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <ng-template #loading>
      <div class="loading-container">
        <mat-spinner></mat-spinner>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .daily-progress-detail {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .detail-header h1 {
        flex: 1;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
        margin-bottom: 24px;
      }

      .info-item label {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }

      .info-item p {
        margin: 0;
        font-size: 16px;
      }

      .section {
        margin: 24px 0;
      }

      .section h3 {
        margin-bottom: 12px;
        color: #333;
      }

      .multiline {
        white-space: pre-wrap;
      }

      .issues {
        color: #ff6b6b;
        padding: 12px;
        background-color: #fff5f5;
        border-radius: 4px;
        border-left: 4px solid #ff6b6b;
      }

      .comments-section {
        margin-bottom: 16px;
      }

      .comment {
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .comment-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .comment-date {
        font-size: 12px;
        color: #666;
      }

      .comment p {
        margin: 0;
      }

      .no-comments {
        text-align: center;
        color: #666;
        padding: 24px;
      }

      .add-comment {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .add-comment mat-form-field {
        width: 100%;
      }

      .approval-info {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background-color: #e8f5e9;
        border-radius: 4px;
        margin-top: 24px;
      }

      .approval-info mat-icon {
        color: #4caf50;
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      .approval-info p {
        margin: 0;
      }

      .approval-info .date {
        font-size: 12px;
        color: #666;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 48px;
      }

      mat-divider {
        margin: 24px 0;
      }
    `,
  ],
})
export class DailyProgressDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dailyProgressService = inject(DailyProgressService);
  private dateFormatService = inject(DateFormatService);

  progress$: Observable<DailyProgress | undefined>;
  newComment = '';
  canApprove = false; // This should be based on user role

  constructor() {
    this.progress$ = this.route.params.pipe(
      switchMap((params) => this.dailyProgressService.getById(params['id'])),
    );
  }

  ngOnInit() {
    // Check user role for approval permissions
  }

  formatDate(date: Date | string | number): string {
    if (!date) return '';
    return this.dateFormatService.formatDate(date);
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'approved':
        return 'primary';
      case 'submitted':
        return 'accent';
      default:
        return 'warn';
    }
  }

  goBack() {
    this.router.navigate(['/daily-progress']);
  }

  edit() {
    const id = this.route.snapshot.params['id'];
    this.router.navigate(['/daily-progress', id, 'edit']);
  }

  submitForApproval() {
    const id = this.route.snapshot.params['id'];
    this.dailyProgressService.submitForApproval(id).subscribe({
      next: () => {
        console.log('Progress report submitted for approval');
      },
      error: (error) => {
        console.error('Error submitting progress report:', error);
      },
    });
  }

  approve() {
    const id = this.route.snapshot.params['id'];
    this.dailyProgressService.approve(id).subscribe({
      next: () => {
        console.log('Progress report approved');
      },
      error: (error) => {
        console.error('Error approving progress report:', error);
      },
    });
  }

  addComment() {
    if (this.newComment.trim()) {
      const id = this.route.snapshot.params['id'];
      this.dailyProgressService.addComment(id, this.newComment).subscribe({
        next: () => {
          this.newComment = '';
          console.log('Comment added successfully');
        },
        error: (error) => {
          console.error('Error adding comment:', error);
        },
      });
    }
  }
}
