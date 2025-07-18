import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div class="report-container">
      <h2>Report Generator</h2>
      <p>Coming soon...</p>
    </div>
  `,
  styles: [
    `
      .report-container {
        padding: 24px;
      }
    `,
  ],
})
export class ReportGeneratorComponent {}
