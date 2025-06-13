import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-supplier-contacts',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="supplier-contacts">
      <h1>Supplier Contacts</h1>
      <mat-card>
        <mat-card-content>
          <p>Supplier contacts coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .supplier-contacts {
        padding: 24px;
      }
    `,
  ],
})
export class SupplierContactsComponent {}
