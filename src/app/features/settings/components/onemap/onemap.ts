import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OneMapService } from '../../services/onemap.service';
import { OneMapRecord, ProcessedOneMapData } from '../../models/onemap.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { OneMapNeonService } from '../../../../core/services/onemap-neon.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-onemap',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    DatePipe,
    MatSnackBarModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
  ],
  templateUrl: './onemap.html',
  styleUrl: './onemap.scss',
})
export class OnemapComponent implements OnInit {
  private fb = inject(FormBuilder);
  private oneMapService = inject(OneMapService);
  private oneMapNeonService = inject(OneMapNeonService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  uploadedData = signal<OneMapRecord[]>([]);
  processedData = signal<ProcessedOneMapData | null>(null);
  isProcessing = signal(false);
  uploadError = signal<string>('');
  
  // Neon import state
  isImportingToNeon = signal(false);
  recentImports = signal<any[]>([]);
  selectedTab = signal(0);

  dateForm = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  });

  headerActions = [
    {
      label: 'Clear',
      icon: 'clear',
      color: 'warn' as const,
      action: () => this.clearAll(),
    },
  ];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      this.uploadError.set('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      this.processCsvFile(csvContent);
    };
    reader.readAsText(file);
  }

  private processCsvFile(csvContent: string): void {
    this.uploadError.set('');

    // Validate headers
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      this.uploadError.set('CSV file is empty or has no data');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const validation = this.oneMapService.validateCsvHeaders(headers);

    if (!validation.valid) {
      this.uploadError.set(
        `Invalid CSV format. Missing required columns: ${validation.missingColumns.join(', ')}\n\nPlease upload a home sign-ups CSV file (like Lawley_Project_Louis.csv), not a pole infrastructure file.`,
      );
      return;
    }

    // Parse data
    const records = this.oneMapService.parseCsvData(csvContent);
    this.uploadedData.set(records);

    // Set default dates based on current date
    const today = new Date();
    const defaultStartDate = new Date(2025, 5, 26); // June 26, 2025
    const defaultEndDate = new Date(2025, 6, 9); // July 9, 2025

    this.dateForm.patchValue({
      startDate: this.formatDateForInput(defaultStartDate),
      endDate: this.formatDateForInput(defaultEndDate),
    });
  }

  processData(): void {
    if (!this.dateForm.valid || this.uploadedData().length === 0) return;

    this.isProcessing.set(true);

    const startDate = new Date(this.dateForm.value.startDate!);
    const endDate = new Date(this.dateForm.value.endDate!);

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    setTimeout(() => {
      const processed = this.oneMapService.processData(this.uploadedData(), startDate, endDate);

      this.processedData.set(processed);
      this.isProcessing.set(false);
    }, 100);
  }

  downloadReport(
    reportType: 'firstEntry' | 'duplicatesPreWindow' | 'noDropAllocated' | 'duplicateDropsRemoved',
  ): void {
    const data = this.processedData();
    if (!data) return;

    const startDate = new Date(this.dateForm.value.startDate!);
    const endDate = new Date(this.dateForm.value.endDate!);
    const dateRange = `${this.formatDateForFilename(startDate)}_${this.formatDateForFilename(endDate)}`;

    let records: OneMapRecord[] = [];
    let filename = '';

    switch (reportType) {
      case 'firstEntry':
        records = data.firstEntryRecords;
        filename = `FirstEntry_${dateRange}.csv`;
        break;
      case 'duplicatesPreWindow':
        records = data.duplicatesPreWindow;
        filename = `Duplicates_PreWindow.csv`;
        break;
      case 'noDropAllocated':
        records = data.noDropAllocated;
        filename = `No_Drop_Allocated.csv`;
        break;
      case 'duplicateDropsRemoved':
        records = data.duplicateDropsRemoved;
        filename = `Duplicate_Drops_Removed.csv`;
        break;
    }

    this.oneMapService.exportToCsv(records, filename);
  }

  clearAll(): void {
    this.uploadedData.set([]);
    this.processedData.set(null);
    this.uploadError.set('');
    this.dateForm.reset();

    // Clear file input
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateForFilename(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Neon import methods
  ngOnInit(): void {
    this.loadRecentImports();
  }

  async importToNeon(): Promise<void> {
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      this.snackBar.open('Please select a file first', 'OK', { duration: 3000 });
      return;
    }

    const file = fileInput.files[0];
    this.isImportingToNeon.set(true);

    try {
      const user = await this.authService.getCurrentUser();
      const userId = user?.uid || 'unknown';
      
      const result = await this.oneMapNeonService.importOneMapExcel(file, userId);
      
      this.snackBar.open(
        `Successfully imported ${result.recordCount} records to Neon database`, 
        'OK', 
        { duration: 5000 }
      );
      
      // Reload recent imports
      await this.loadRecentImports();
      
      // Clear the form
      this.clearAll();
    } catch (error) {
      console.error('Neon import error:', error);
      this.snackBar.open(
        'Failed to import to Neon: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'OK',
        { duration: 5000 }
      );
    } finally {
      this.isImportingToNeon.set(false);
    }
  }

  async loadRecentImports(): Promise<void> {
    try {
      const imports = await this.oneMapNeonService.getRecentImports(10).toPromise();
      this.recentImports.set(imports || []);
    } catch (error) {
      console.error('Failed to load recent imports:', error);
    }
  }

  getImportStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'processing': return 'accent';
      case 'failed': return 'warn';
      default: return '';
    }
  }
}
