import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-pole-analytics-wizard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div class="wizard-container">
      <h2>Pole Analytics Wizard</h2>
      <p>Coming soon...</p>
    </div>
  `,
  styles: [
    `
      .wizard-container {
        padding: 24px;
      }
    `,
  ],
})
export class PoleAnalyticsWizardComponent {}
