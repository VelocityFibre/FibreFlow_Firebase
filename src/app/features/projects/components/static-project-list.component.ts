import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-static-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h1>Projects</h1>
      <div class="empty-state">
        <mat-icon>folder_open</mat-icon>
        <h2>No projects yet</h2>
        <p>Create your first fiber optic project to get started</p>
        <button mat-raised-button color="primary" routerLink="/projects/new">
          <mat-icon>add</mat-icon>
          Create Your First Project
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
      }

      h1 {
        margin: 0 0 24px 0;
        font-size: 32px;
        font-weight: 400;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 32px;
        text-align: center;
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ccc;
        margin-bottom: 24px;
      }

      .empty-state h2 {
        font-size: 24px;
        font-weight: 400;
        margin: 0 0 8px 0;
      }

      .empty-state p {
        font-size: 16px;
        color: #666;
        margin: 0 0 24px 0;
      }
    `,
  ],
})
export class StaticProjectListComponent {
  // No Firebase calls, no async operations
}
