import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-data-processor',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div class="processor-container">
      <h2>Data Processor</h2>
      <p>Coming soon...</p>
    </div>
  `,
  styles: [
    `
      .processor-container {
        padding: 24px;
      }
    `,
  ],
})
export class DataProcessorComponent {}
