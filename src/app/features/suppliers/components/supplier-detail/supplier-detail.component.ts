import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="supplier-detail">
      <h1>Supplier Detail</h1>
      <mat-card>
        <mat-card-content>
          <p>Supplier details coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .supplier-detail {
        padding: 24px;
      }
    `,
  ],
})
export class SupplierDetailComponent {}
