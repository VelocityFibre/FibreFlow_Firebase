import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { CsvAnalysisService } from '../services/csv-analysis.service';
import {
  CsvAnalysisResult,
  CsvAnalysisConfig,
  CsvRecord,
  CsvValidationResult,
} from '../models/csv-analysis.model';

@Component({
  selector: 'app-csv-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTableModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './csv-analysis.component.html',
  styleUrl: './csv-analysis.component.scss',
})
export class CsvAnalysisComponent {
  private fb = inject(FormBuilder);
  private csvAnalysisService = inject(CsvAnalysisService);
  private snackBar = inject(MatSnackBar);

  // Reactive state using signals
  csvContent = signal<string>('');
  isProcessing = signal<boolean>(false);
  analysisResult = signal<CsvAnalysisResult | null>(null);
  validationResult = signal<CsvValidationResult | null>(null);
  selectedFile = signal<File | null>(null);

  // Form for date range configuration
  configForm = this.fb.group({
    startDate: [new Date(), Validators.required],
    endDate: [new Date(), Validators.required],
    filename: ['', Validators.required],
  });

  // Computed properties
  hasAnalysisResults = computed(() => this.analysisResult() !== null);
  dataQualityColor = computed(() => {
    const score = this.analysisResult()?.dataQualityScore || 0;
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  });

  // Table columns for different report types
  displayedColumns = [
    'propertyId',
    'poleNumber',
    'dropNumber',
    'status',
    'fieldAgentName',
    'lastModifiedDate',
  ];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      // Auto-populate filename in form
      const filename = file.name.replace('.csv', '');
      this.configForm.patchValue({ filename });

      this.readCsvFile(file);
    }
  }

  private readCsvFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.csvContent.set(content);

      // Validate immediately upon loading
      this.validateCsvStructure(content);
    };
    reader.readAsText(file);
  }

  private validateCsvStructure(csvContent: string): void {
    if (!csvContent.trim()) return;

    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      this.snackBar.open('CSV file must have header and data rows', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const headerValidation = this.csvAnalysisService.validateCsvHeaders(headers);

    if (!headerValidation.valid) {
      this.snackBar.open(
        `Missing required columns: ${headerValidation.missingColumns.join(', ')}`,
        'Close',
        {
          duration: 5000,
          panelClass: ['error-snackbar'],
        },
      );
    } else {
      this.snackBar.open('CSV structure validated successfully', 'Close', {
        duration: 2000,
        panelClass: ['success-snackbar'],
      });
    }
  }

  processData(): void {
    if (!this.csvContent() || this.configForm.invalid) {
      this.snackBar.open('Please select a CSV file and configure date range', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isProcessing.set(true);

    try {
      const config: CsvAnalysisConfig = {
        startDate: this.configForm.value.startDate!,
        endDate: this.configForm.value.endDate!,
        filename: this.configForm.value.filename!,
      };

      // Use proven analysis logic
      const result = this.csvAnalysisService.analyzeCsvData(this.csvContent(), config);
      this.analysisResult.set(result);

      this.snackBar.open(
        `Analysis complete! Processed ${result.totalRecords} records with ${result.dataQualityScore}% quality score`,
        'Close',
        {
          duration: 4000,
          panelClass: ['success-snackbar'],
        },
      );
    } catch (error) {
      console.error('Analysis error:', error);
      this.snackBar.open('Error processing CSV data', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Download specific report using proven export logic
  downloadReport(
    reportType:
      | 'first-entry'
      | 'duplicates-pre-window'
      | 'no-drop-allocated'
      | 'duplicate-drops-removed',
  ): void {
    const result = this.analysisResult();
    if (!result) return;

    let records: CsvRecord[] = [];
    let filename = '';

    switch (reportType) {
      case 'first-entry':
        records = result.firstEntryRecords;
        filename = `FirstEntry_${this.formatDateForFilename(this.configForm.value.startDate!)}-${this.formatDateForFilename(this.configForm.value.endDate!)}.csv`;
        break;
      case 'duplicates-pre-window':
        records = result.duplicatesPreWindow;
        filename = `Duplicates_PreWindow_${this.formatDateForFilename(this.configForm.value.startDate!)}.csv`;
        break;
      case 'no-drop-allocated':
        records = result.noDropAllocated;
        filename = `No_Drop_Allocated_${this.formatDateForFilename(new Date())}.csv`;
        break;
      case 'duplicate-drops-removed':
        records = result.duplicateDropsRemoved;
        filename = `Duplicate_Drops_Removed_${this.formatDateForFilename(new Date())}.csv`;
        break;
    }

    // Use proven export function
    this.csvAnalysisService.exportToCsv(records, filename);

    this.snackBar.open(`Downloaded ${records.length} records`, 'Close', {
      duration: 2000,
    });
  }

  // Download all reports at once
  downloadAllReports(): void {
    const result = this.analysisResult();
    if (!result) return;

    // Download all 4 report types using proven logic
    this.downloadReport('first-entry');
    this.downloadReport('duplicates-pre-window');
    this.downloadReport('no-drop-allocated');
    this.downloadReport('duplicate-drops-removed');

    this.snackBar.open('All reports downloaded successfully', 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  // Reset analysis to start over
  resetAnalysis(): void {
    this.csvContent.set('');
    this.analysisResult.set(null);
    this.validationResult.set(null);
    this.selectedFile.set(null);
    this.configForm.reset({
      startDate: new Date(),
      endDate: new Date(),
      filename: '',
    });
  }

  // Get quality status text for display
  getQualityStatusText(): string {
    const score = this.analysisResult()?.dataQualityScore || 0;
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }
}
