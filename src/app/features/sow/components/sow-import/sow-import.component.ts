import { Component, EventEmitter, Output, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';

import { SOWExcelService } from '../../services/sow-excel.service';
import { ExcelParseResult } from '../../models/sow-import.model';

@Component({
  selector: 'app-sow-import',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatListModule
  ],
  template: `
    <div class="sow-import-container">
      <!-- Header -->
      <div class="import-header">
        <mat-icon>upload_file</mat-icon>
        <h2>Import SOW Data</h2>
        <p>Upload Excel files containing poles, drops, and fibre data</p>
      </div>

      <!-- Import Methods -->
      <div class="import-methods">
        <mat-card class="method-card" [class.active]="activeMethod() === 'upload'">
          <mat-card-header>
            <mat-card-title>Upload Excel File</mat-card-title>
            <mat-card-subtitle>Import from existing Excel files</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <!-- File Drop Zone -->
            <div 
              class="file-drop-zone"
              [class.dragover]="isDragover()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()">
              
              <mat-icon class="drop-icon">cloud_upload</mat-icon>
              <h3>Drop Excel files here</h3>
              <p>or click to browse files</p>
              <span class="file-types">Supports .xlsx, .xls files</span>
              
              <div class="import-guidance">
                <strong>Recommended Import Order:</strong><br>
                1. Poles file first (infrastructure)<br>
                2. Drops file second (connections)<br>
                3. Fibre file third (cable routes)<br>
                <em>Import one at a time for better results</em>
              </div>
              
              <input 
                #fileInput 
                type="file" 
                hidden 
                accept=".xlsx,.xls"
                multiple
                (change)="onFileSelected($event)">
            </div>

            <!-- Selected Files -->
            <div *ngIf="selectedFiles().length > 0" class="selected-files">
              <h4>Selected Files:</h4>
              <mat-chip-set>
                <mat-chip 
                  *ngFor="let file of selectedFiles(); let i = index"
                  [removable]="true"
                  (removed)="removeFile(i)">
                  {{ file.name }}
                  <mat-icon matChipRemove>cancel</mat-icon>
                </mat-chip>
              </mat-chip-set>
            </div>

            <!-- Process Button -->
            <div class="process-section">
              <button 
                mat-raised-button 
                color="primary" 
                [disabled]="selectedFiles().length === 0 || isLoading"
                (click)="processFiles()"
                class="process-button">
                <mat-icon>play_arrow</mat-icon>
                Process Files
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="method-card template-card">
          <mat-card-header>
            <mat-card-title>Download Template</mat-card-title>
            <mat-card-subtitle>Get the standard SOW Excel template</mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            <p>Download our Excel template with sample data and proper formatting.</p>
            
            <button 
              mat-stroked-button 
              color="accent"
              (click)="downloadTemplate()"
              [disabled]="isLoading"
              class="template-button">
              <mat-icon>download</mat-icon>
              Download Template
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Processing Progress -->
      <mat-card *ngIf="isProcessing()" class="progress-card">
        <mat-card-header>
          <mat-card-title>Processing Files</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p class="progress-text">{{ processingMessage() }}</p>
        </mat-card-content>
      </mat-card>

      <!-- Import Results -->
      <mat-card *ngIf="importResult()" class="results-card">
        <mat-card-header>
          <mat-card-title>
            Import Results
            <mat-icon 
              [class.success]="importResult()!.summary.errorRows === 0"
              [class.warning]="importResult()!.summary.errorRows > 0">
              {{ importResult()!.summary.errorRows === 0 ? 'check_circle' : 'warning' }}
            </mat-icon>
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Summary Stats -->
          <div class="result-summary">
            <div class="stat-chip success">
              <span class="stat-number">{{ importResult()!.poles.length }}</span>
              <span class="stat-label">Poles</span>
            </div>
            <div class="stat-chip success">
              <span class="stat-number">{{ importResult()!.drops.length }}</span>
              <span class="stat-label">Drops</span>
            </div>
            <div class="stat-chip success">
              <span class="stat-number">{{ importResult()!.fibre.length }}</span>
              <span class="stat-label">Fibre Segments</span>
            </div>
            <div class="stat-chip" [class.error]="importResult()!.errors.length > 0">
              <span class="stat-number">{{ importResult()!.errors.length }}</span>
              <span class="stat-label">Errors</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Import Errors -->
          <div *ngIf="importResult()!.errors.length > 0" class="errors-section">
            <h4>Import Errors ({{ importResult()!.errors.length }})</h4>
            <mat-list>
              <mat-list-item *ngFor="let error of importResult()!.errors.slice(0, 10)">
                <mat-icon matListItemIcon color="warn">error</mat-icon>
                <div matListItemTitle>Row {{ error.row }}: {{ error.error }}</div>
                <div matListItemLine>Sheet: {{ error.sheet }}</div>
              </mat-list-item>
              <mat-list-item *ngIf="importResult()!.errors.length > 10">
                <mat-icon matListItemIcon>more_horiz</mat-icon>
                <div matListItemTitle>{{ importResult()!.errors.length - 10 }} more errors...</div>
              </mat-list-item>
            </mat-list>
          </div>

          <!-- Action Buttons -->
          <div class="result-actions">
            <button 
              mat-raised-button 
              color="primary"
              [disabled]="importResult()!.summary.validRows === 0"
              (click)="proceedToValidation()">
              <mat-icon>arrow_forward</mat-icon>
              Proceed to Validation
            </button>
            
            <button 
              mat-stroked-button
              (click)="clearResults()">
              <mat-icon>refresh</mat-icon>
              Import New Files
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './sow-import.component.scss'
})
export class SOWImportComponent {
  @Output() dataImported = new EventEmitter<ExcelParseResult>();
  @Output() validationRequested = new EventEmitter<void>();
  @Input() isLoading = false;

  private snackBar = inject(MatSnackBar);
  private excelService = inject(SOWExcelService);

  // Component state
  activeMethod = signal<'upload' | 'template'>('upload');
  selectedFiles = signal<File[]>([]);
  isDragover = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  processingMessage = signal<string>('');
  importResult = signal<ExcelParseResult | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragover.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]) {
    // Filter for Excel files
    const excelFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.xlsx') || 
      file.name.toLowerCase().endsWith('.xls')
    );

    if (excelFiles.length !== files.length) {
      this.snackBar.open('Only Excel files (.xlsx, .xls) are supported', 'Close', {
        duration: 3000
      });
    }

    if (excelFiles.length > 0) {
      this.selectedFiles.set([...this.selectedFiles(), ...excelFiles]);
    }
  }

  removeFile(index: number) {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);
  }

  async processFiles() {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    this.isProcessing.set(true);
    this.importResult.set(null);

    try {
      // For now, process only the first file
      // TODO: Handle multiple files
      const file = files[0];
      this.processingMessage.set(`Processing ${file.name}...`);

      this.excelService.parseExcelFile(file).subscribe({
        next: (result) => {
          this.importResult.set(result);
          this.isProcessing.set(false);
          
          this.snackBar.open(
            `Processed ${result.summary.totalRows} rows with ${result.errors.length} errors`,
            'Close',
            { duration: 5000 }
          );

          // Emit the result to parent component
          this.dataImported.emit(result);
        },
        error: (error) => {
          console.error('Excel processing error:', error);
          this.snackBar.open(`Processing failed: ${error.message}`, 'Close', {
            duration: 5000
          });
          this.isProcessing.set(false);
        }
      });

    } catch (error) {
      console.error('File processing error:', error);
      this.snackBar.open('Error processing files', 'Close', { duration: 3000 });
      this.isProcessing.set(false);
    }
  }

  async downloadTemplate() {
    try {
      this.excelService.generateTemplate().subscribe({
        next: (blob) => {
          this.downloadBlob(blob, 'SOW_Template.xlsx');
          this.snackBar.open('Template downloaded successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Template generation error:', error);
          this.snackBar.open('Error generating template', 'Close', {
            duration: 3000
          });
        }
      });
    } catch (error) {
      console.error('Template download error:', error);
      this.snackBar.open('Error downloading template', 'Close', { duration: 3000 });
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  proceedToValidation() {
    this.validationRequested.emit();
  }

  clearResults() {
    this.selectedFiles.set([]);
    this.importResult.set(null);
    this.isProcessing.set(false);
  }
}