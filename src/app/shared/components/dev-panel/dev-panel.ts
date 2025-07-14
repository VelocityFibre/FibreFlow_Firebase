import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';

import { DevNoteService } from '../../../core/services/dev-note.service';
import { RouteTrackerService } from '../../../core/services/route-tracker.service';
import { AuthService } from '../../../core/services/auth.service';
import { DevTask, PageError } from '../../../core/models/dev-note.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-dev-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatExpansionModule,
  ],
  templateUrl: './dev-panel.html',
  styleUrl: './dev-panel.scss',
})
export class DevPanel {
  private devNoteService = inject(DevNoteService);
  private routeTracker = inject(RouteTrackerService);
  private authService = inject(AuthService);

  // Panel state
  isOpen = signal(false);
  isMinimized = signal(false);

  // Current route info
  currentRoute = this.routeTracker.currentRoute;

  // Current page dev note
  currentNote = toSignal(
    this.routeTracker.currentRoute$.pipe(
      switchMap((route) => {
        const routeKey = this.routeTracker.getRouteKey(route.path);
        return this.devNoteService.getOrCreateForRoute(routeKey, route.title);
      }),
    ),
  );

  // Dev stats
  devStats = toSignal(this.devNoteService.getDevStats());

  // New task form
  newTaskText = signal('');
  newTaskPriority = signal<'low' | 'medium' | 'high'>('medium');

  // Edit mode for notes
  isEditingNotes = signal(false);
  notesText = signal('');

  // Check if user is admin
  isAdmin = computed(() => {
    const userRole = this.authService.userRole();
    return userRole === 'admin';
  });

  constructor() {
    // Update notes text when current note changes
    effect(() => {
      const note = this.currentNote();
      if (note) {
        this.notesText.set(note.notes || '');
      }
    });
  }

  togglePanel() {
    this.isOpen.update((v) => !v);
  }

  toggleMinimize() {
    this.isMinimized.update((v) => !v);
  }

  async addTask() {
    const text = this.newTaskText().trim();
    if (!text) return;

    const route = this.currentRoute();
    if (!route) return;

    const routeKey = this.routeTracker.getRouteKey(route.path);
    await this.devNoteService.addTask(routeKey, {
      text,
      status: 'todo',
      priority: this.newTaskPriority(),
      assignee: this.authService.currentUser()?.email,
    });

    // Reset form
    this.newTaskText.set('');
    this.newTaskPriority.set('medium');
  }

  async updateTaskStatus(task: DevTask, status: DevTask['status']) {
    const route = this.currentRoute();
    if (!route) return;

    const routeKey = this.routeTracker.getRouteKey(route.path);
    await this.devNoteService.updateTaskStatus(routeKey, task.id, status);
  }

  async saveNotes() {
    const note = this.currentNote();
    if (!note?.id) return;

    await this.devNoteService.update(note.id, {
      notes: this.notesText(),
      updatedBy: this.authService.currentUser()?.email || 'system',
    });

    this.isEditingNotes.set(false);
  }

  getTaskIcon(status: DevTask['status']): string {
    switch (status) {
      case 'todo':
        return 'radio_button_unchecked';
      case 'in-progress':
        return 'pending';
      case 'done':
        return 'check_circle';
    }
  }

  getPriorityColor(priority: DevTask['priority']): string {
    switch (priority) {
      case 'high':
        return 'warn';
      case 'medium':
        return 'accent';
      case 'low':
        return 'primary';
    }
  }

  getUnfinishedTaskCount(tasks: DevTask[] | undefined): number {
    if (!tasks) return 0;
    return tasks.filter(t => t.status !== 'done').length;
  }

  getUnresolvedErrorCount(errors: PageError[] | undefined): number {
    if (!errors) return 0;
    return errors.filter(e => !e.resolved).length;
  }
}
