import { NgModule } from '@angular/core';

// Core UI modules used in 20+ files
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

// Form modules used in 20+ files
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// Dialog and feedback modules used in 10+ files
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Data display modules used in 10+ files
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

// Date-related modules used in 8+ files
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Additional commonly used modules (5+ files)
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatListModule } from '@angular/material/list';

const MATERIAL_MODULES = [
  // Core UI
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatChipsModule,
  // Forms
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  // Dialog & Feedback
  MatDialogModule,
  MatProgressSpinnerModule,
  MatTooltipModule,
  MatSnackBarModule,
  MatProgressBarModule,
  // Data Display
  MatTableModule,
  MatMenuModule,
  MatDividerModule,
  MatBadgeModule,
  // Date
  MatDatepickerModule,
  MatNativeDateModule,
  // Additional
  MatCheckboxModule,
  MatStepperModule,
  MatListModule,
];

@NgModule({
  imports: MATERIAL_MODULES,
  exports: MATERIAL_MODULES,
})
export class SharedMaterialModule {}
