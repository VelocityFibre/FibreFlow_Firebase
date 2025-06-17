import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { DailyProgressListComponent } from '../../components/daily-progress-list/daily-progress-list.component';
import { DailyProgressFormComponent } from '../../components/daily-progress-form/daily-progress-form.component';
import { DailyProgressDetailComponent } from '../../components/daily-progress-detail/daily-progress-detail.component';
import { DailyProgressService } from '../../services/daily-progress.service';
import { DailyProgress } from '../../models/daily-progress.model';

@Component({
  selector: 'app-daily-progress-page',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    DailyProgressListComponent,
    DailyProgressFormComponent,
    DailyProgressDetailComponent,
  ],
  template: `
    <div class="daily-progress-page">
      <ng-container [ngSwitch]="currentView">
        <app-daily-progress-list *ngSwitchCase="'list'"></app-daily-progress-list>

        <app-daily-progress-form
          *ngSwitchCase="'new'"
          (save)="onSave($event)"
          (cancelForm)="onCancel()"
        >
        </app-daily-progress-form>

        <app-daily-progress-form
          *ngSwitchCase="'edit'"
          [progress]="selectedProgress"
          (save)="onUpdate($event)"
          (cancelForm)="onCancel()"
        >
        </app-daily-progress-form>

        <app-daily-progress-detail *ngSwitchCase="'detail'"></app-daily-progress-detail>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .daily-progress-page {
        height: 100%;
      }
    `,
  ],
})
export class DailyProgressPageComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dailyProgressService = inject(DailyProgressService);

  currentView: 'list' | 'new' | 'edit' | 'detail' = 'list';
  selectedProgress?: DailyProgress;

  constructor() {
    // Determine view based on route
    this.route.url.subscribe((segments) => {
      if (segments.length === 0) {
        this.currentView = 'list';
      } else if (segments[0].path === 'new') {
        this.currentView = 'new';
      } else if (segments.length === 2 && segments[1].path === 'edit') {
        this.currentView = 'edit';
        this.loadProgress(segments[0].path);
      } else if (segments.length === 1) {
        this.currentView = 'detail';
      }
    });
  }

  loadProgress(id: string) {
    this.dailyProgressService.getById(id).subscribe((progress) => {
      this.selectedProgress = progress;
    });
  }

  onSave(progressData: Partial<DailyProgress>) {
    this.dailyProgressService.create(progressData as Omit<DailyProgress, 'id'>).subscribe({
      next: (id) => {
        console.log('Daily progress created with ID:', id);
        this.router.navigate(['/daily-progress']);
      },
      error: (error) => {
        console.error('Error creating daily progress:', error);
      },
    });
  }

  onUpdate(progressData: Partial<DailyProgress>) {
    if (this.selectedProgress?.id) {
      this.dailyProgressService.update(this.selectedProgress.id, progressData).subscribe({
        next: () => {
          console.log('Daily progress updated');
          this.router.navigate(['/daily-progress']);
        },
        error: (error) => {
          console.error('Error updating daily progress:', error);
        },
      });
    }
  }

  onCancel() {
    this.router.navigate(['/daily-progress']);
  }
}
