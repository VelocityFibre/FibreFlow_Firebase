import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BOQService } from '../../services/boq.service';
import { Project } from '../../../../core/models/project.model';

interface DialogData {
  projects: Project[];
  selectedProjectId?: string | null;
}

@Component({
  selector: 'app-boq-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Import BOQ from CSV</h2>

    <mat-dialog-content>
      <div class="import-container">
        <div class="instructions">
          <p>Upload a CSV file containing BOQ items. The file should include columns for:</p>
          <ul>
            <li><strong>Item Code</strong> - Unique identifier for the item</li>
            <li><strong>Description</strong> - Item description</li>
            <li><strong>Quantity</strong> - Required quantity</li>
            <li><strong>Item Rate</strong> - Unit price (can include R prefix)</li>
            <li><strong>UoM</strong> - Unit of measure (e.g., Each, Meters)</li>
            <li><strong>Item Category</strong> (optional) - Used as specification</li>
            <li><strong>Supplier</strong> (optional) - For reference</li>
          </ul>
        </div>

        <mat-form-field appearance="outline" class="project-field">
          <mat-label>Project</mat-label>
          <mat-select [(ngModel)]="selectedProjectId" required>
            <mat-option *ngFor="let project of projects" [value]="project.id">
              {{ project.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div
          class="file-upload-area"
          [class.has-file]="selectedFile"
          (click)="fileInput.click()"
          (drop)="onFileDrop($event)"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
        >
          <input #fileInput type="file" accept=".csv" (change)="onFileSelected($event)" hidden />

          <div class="upload-content" *ngIf="!selectedFile">
            <mat-icon>cloud_upload</mat-icon>
            <p>Click to browse or drag and drop CSV file here</p>
          </div>

          <div class="file-info" *ngIf="selectedFile">
            <mat-icon>description</mat-icon>
            <div class="file-details">
              <p class="file-name">{{ selectedFile.name }}</p>
              <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <button mat-icon-button (click)="removeFile($event)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>

        <div class="preview-section" *ngIf="previewData.length > 0">
          <h3>Preview (First 5 rows)</h3>
          <div class="table-container">
            <table mat-table [dataSource]="previewData">
              <ng-container *ngFor="let column of previewColumns" [matColumnDef]="column">
                <th mat-header-cell *matHeaderCellDef>{{ column }}</th>
                <td mat-cell *matCellDef="let row">{{ row[column] }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="previewColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: previewColumns"></tr>
            </table>
          </div>
          <p class="preview-info" *ngIf="totalRows > 5">
            Showing first 5 rows of {{ totalRows }} total rows
          </p>
        </div>

        <mat-progress-bar *ngIf="importing" mode="indeterminate"></mat-progress-bar>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="importing">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!selectedFile || !selectedProjectId || importing"
        (click)="onImport()"
      >
        {{ importing ? 'Importing...' : 'Import BOQ' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .import-container {
        min-width: 600px;
        max-width: 800px;
      }

      .instructions {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
        overflow-x: auto;
      }

      .instructions p {
        margin: 0 0 8px;
        font-weight: 500;
      }

      .instructions ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }

      .instructions li {
        margin-bottom: 6px;
        color: #666;
        word-break: break-word;
        line-height: 1.4;
        font-size: 13px;
      }
      
      .instructions strong {
        color: #333;
        display: inline-block;
        min-width: 100px;
      }

      .project-field {
        width: 100%;
        margin-bottom: 16px;
      }

      .file-upload-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 32px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 24px;
      }

      .file-upload-area:hover {
        border-color: #1976d2;
        background-color: #f5f5f5;
      }

      .file-upload-area.has-file {
        border-style: solid;
        padding: 16px;
      }

      .upload-content mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #666;
        margin-bottom: 8px;
      }

      .upload-content p {
        margin: 0;
        color: #666;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .file-info mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #1976d2;
      }

      .file-details {
        flex: 1;
        text-align: left;
      }

      .file-name {
        margin: 0;
        font-weight: 500;
        color: #333;
      }

      .file-size {
        margin: 0;
        font-size: 12px;
        color: #666;
      }

      .preview-section {
        margin-top: 24px;
      }

      .preview-section h3 {
        margin: 0 0 12px;
        font-size: 16px;
        font-weight: 500;
      }

      .table-container {
        max-height: 300px;
        overflow: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      table {
        width: 100%;
      }

      th {
        background-color: #f5f5f5;
        font-weight: 600;
        position: sticky;
        top: 0;
        z-index: 1;
      }

      td {
        font-size: 14px;
      }

      .preview-info {
        margin: 0;
        font-size: 12px;
        color: #666;
        text-align: right;
      }

      mat-progress-bar {
        margin-top: 16px;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 16px -24px -24px;
        border-top: 1px solid #e0e0e0;
      }
    `,
  ],
})
export class BOQImportDialogComponent {
  projects: Project[] = [];
  selectedProjectId = '';
  selectedFile: File | null = null;
  previewData: Record<string, string>[] = [];
  previewColumns: string[] = [];
  totalRows = 0;
  importing = false;

  private boqService = inject(BOQService);
  private dialogRef = inject(MatDialogRef<BOQImportDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as DialogData;

  constructor() {
    this.projects = this.data.projects || [];
    // Pre-select project if provided
    if (this.data.selectedProjectId) {
      this.selectedProjectId = this.data.selectedProjectId;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        this.processFile(file);
      } else {
        alert('Please upload a CSV file');
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  processFile(file: File) {
    this.selectedFile = file;
    this.parseCSVPreview(file);
  }

  parseCSVPreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        alert('The CSV file is empty');
        this.removeFile(new Event('click'));
        return;
      }

      // Parse headers
      const headers = this.parseCSVLine(lines[0]);
      this.previewColumns = headers.slice(0, 6); // Show max 6 columns

      // Parse data rows (max 5 for preview)
      this.previewData = [];
      for (let i = 1; i < Math.min(6, lines.length); i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length > 0) {
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          this.previewData.push(row);
        }
      }

      this.totalRows = lines.length - 1; // Excluding header
    };
    reader.readAsText(file);
  }

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      result.push(current.trim());
    }

    return result;
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
    this.previewData = [];
    this.previewColumns = [];
    this.totalRows = 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onCancel() {
    this.dialogRef.close();
  }

  onImport() {
    if (!this.selectedFile || !this.selectedProjectId) return;

    this.importing = true;
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length <= 1) {
        alert('No data found in the CSV file');
        this.importing = false;
        return;
      }

      const headers = this.parseCSVLine(lines[0]);
      const csvData: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length > 0) {
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          csvData.push(row);
        }
      }

      this.boqService.importBOQItems(this.selectedProjectId, csvData).subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error importing BOQ items:', error);
          alert('Failed to import BOQ items. Please check your CSV format and try again.');
          this.importing = false;
        },
      });
    };

    reader.readAsText(this.selectedFile);
  }
}
