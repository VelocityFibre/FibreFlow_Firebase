import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inline-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 24px;">
      <h1>Dashboard</h1>
      <p>Welcome to FibreFlow</p>
      <div style="margin-top: 24px; padding: 24px; border: 1px solid #ccc; border-radius: 8px;">
        <h2>Total Projects</h2>
        <p style="font-size: 48px; margin: 0;">0</p>
      </div>
    </div>
  `,
  styles: [],
})
export class InlineDashboardComponent {}
