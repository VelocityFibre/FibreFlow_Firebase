import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface FilterField {
  type: 'text' | 'select' | 'date' | 'daterange' | 'checkbox';
  key: string;
  label: string;
  placeholder?: string;
  options?: { value: string | number | boolean; label: string }[];
  multiple?: boolean;
  appearance?: 'fill' | 'outline';
  width?: string;
  icon?: string;
}

@Component({
  selector: 'app-filter-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatCheckboxModule,
  ],
  template: `
    <mat-card class="filters-card">
      <mat-card-content>
        <form [formGroup]="formGroup" class="filter-form">
          <ng-container *ngFor="let field of fields">
            <!-- Text Input -->
            <mat-form-field
              *ngIf="field.type === 'text'"
              [appearance]="field.appearance || 'outline'"
              [style.width]="field.width || 'auto'"
            >
              <mat-label>{{ field.label }}</mat-label>
              <input
                matInput
                [formControlName]="field.key"
                [placeholder]="field.placeholder || ''"
              />
              <mat-icon matPrefix *ngIf="field.icon">{{ field.icon }}</mat-icon>
            </mat-form-field>

            <!-- Select Dropdown -->
            <mat-form-field
              *ngIf="field.type === 'select'"
              [appearance]="field.appearance || 'outline'"
              [style.width]="field.width || 'auto'"
            >
              <mat-label>{{ field.label }}</mat-label>
              <mat-select [formControlName]="field.key" [multiple]="field.multiple || false">
                <mat-option *ngFor="let option of field.options" [value]="option.value">
                  {{ option.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Date Input -->
            <mat-form-field
              *ngIf="field.type === 'date'"
              [appearance]="field.appearance || 'outline'"
              [style.width]="field.width || 'auto'"
            >
              <mat-label>{{ field.label }}</mat-label>
              <input matInput [matDatepicker]="picker" [formControlName]="field.key" />
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>

            <!-- Checkbox -->
            <mat-checkbox
              *ngIf="field.type === 'checkbox'"
              [formControlName]="field.key"
              class="filter-checkbox"
            >
              {{ field.label }}
            </mat-checkbox>
          </ng-container>

          <!-- Action Buttons -->
          <div class="filter-actions" *ngIf="showActions">
            <button mat-button type="button" (click)="onReset()" *ngIf="showReset">
              <mat-icon>clear</mat-icon>
              Reset
            </button>
            <button
              mat-raised-button
              color="primary"
              type="button"
              (click)="onApply()"
              *ngIf="showApply"
            >
              <mat-icon>search</mat-icon>
              Apply Filters
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .filter-form {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        flex-wrap: wrap;
      }

      .filter-form mat-form-field {
        min-width: 200px;
      }

      .filter-checkbox {
        margin-bottom: 1.25em; // Align with form fields
      }

      .filter-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }

      @media (max-width: 768px) {
        .filter-form {
          flex-direction: column;
          align-items: stretch;
        }

        .filter-form mat-form-field,
        .filter-checkbox {
          width: 100%;
        }

        .filter-actions {
          margin-left: 0;
          margin-top: 16px;
        }
      }
    `,
  ],
})
export class FilterFormComponent {
  @Input() formGroup!: FormGroup;
  @Input() fields: FilterField[] = [];
  @Input() showActions: boolean = true;
  @Input() showReset: boolean = true;
  @Input() showApply: boolean = true;

  @Output() resetForm = new EventEmitter<void>();
  @Output() applyFilters = new EventEmitter<Record<string, unknown>>();

  onReset() {
    this.formGroup.reset();
    this.resetForm.emit();
  }

  onApply() {
    this.applyFilters.emit(this.formGroup.value);
  }
}
