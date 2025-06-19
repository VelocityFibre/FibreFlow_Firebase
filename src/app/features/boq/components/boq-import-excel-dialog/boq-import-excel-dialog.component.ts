import { Component, inject, OnInit } from '@angular/core';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';

import { BOQService } from '../../services/boq.service';
import { ExcelImportService, ExcelSheet, BOQImportRow } from '../../services/excel-import.service';
import { Project } from '../../../../core/models/project.model';
import { BOQItem } from '../../models/boq.model';

interface DialogData {
  projects: Project[];
  selectedProjectId?: string | null;
}

@Component({
  selector: 'app-boq-import-excel-dialog',
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
    MatProgressSpinnerModule,
    MatStepperModule,
    MatRadioModule,
  ],
  template: `
    <h2 mat-dialog-title>Import BOQ from Excel</h2>

    <mat-dialog-content>
      <div class="import-wizard">
        <!-- Step 1: Select Project -->
        <div class="step" *ngIf="currentStep === 1">
          <h3>Step 1: Select Project</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Project</mat-label>
            <mat-select [(ngModel)]="selectedProjectId" required>
              <mat-option *ngFor="let project of projects" [value]="project.id">
                {{ project.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Step 2: Upload Excel File -->
        <div class="step" *ngIf="currentStep === 2">
          <h3>Step 2: Upload Excel File</h3>
          <div
            class="file-upload-area"
            [class.has-file]="selectedFile"
            (click)="fileInput.click()"
            (drop)="onFileDrop($event)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
          >
            <input
              #fileInput
              type="file"
              accept=".xlsx,.xls"
              (change)="onFileSelected($event)"
              style="display: none"
            />

            <div *ngIf="!selectedFile" class="upload-content">
              <mat-icon>cloud_upload</mat-icon>
              <p>Click to upload or drag and drop</p>
              <p class="file-types">Excel files (.xlsx, .xls)</p>
            </div>

            <div *ngIf="selectedFile" class="file-info">
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

          <div *ngIf="loadingSheets" class="loading">
            <mat-spinner diameter="30"></mat-spinner>
            <p>Reading Excel file...</p>
          </div>
        </div>

        <!-- Step 3: Select Sheet -->
        <div class="step" *ngIf="currentStep === 3">
          <h3>Step 3: Select Sheet</h3>
          <div class="sheets-list">
            <mat-radio-group [(ngModel)]="selectedSheet">
              <div *ngFor="let sheet of availableSheets" class="sheet-option">
                <mat-radio-button [value]="sheet.name">
                  <div class="sheet-info">
                    <strong>{{ sheet.name }}</strong>
                    <span class="row-count">{{ sheet.rowCount }} rows</span>
                  </div>
                </mat-radio-button>

                <div class="sheet-preview" *ngIf="sheet.preview.length > 0">
                  <table>
                    <tr *ngFor="let row of sheet.preview.slice(0, 5)">
                      <td *ngFor="let cell of row.slice(0, 6)">
                        {{ cell || '' }}
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </mat-radio-group>
          </div>
        </div>

        <!-- Step 4: Preview & Import -->
        <div class="step" *ngIf="currentStep === 4">
          <h3>Step 4: Preview & Import</h3>

          <div *ngIf="parsingSheet" class="loading">
            <mat-spinner diameter="30"></mat-spinner>
            <p>Parsing BOQ data...</p>
          </div>

          <div *ngIf="!parsingSheet && parsedItems.length > 0" class="preview-section">
            <p class="summary">Found {{ parsedItems.length }} BOQ items</p>

            <div class="table-container">
              <table mat-table [dataSource]="previewItems" class="preview-table">
                <ng-container matColumnDef="itemCode">
                  <th mat-header-cell *matHeaderCellDef>Item Code</th>
                  <td mat-cell *matCellDef="let item">{{ item.itemCode }}</td>
                </ng-container>

                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>Description</th>
                  <td mat-cell *matCellDef="let item">{{ item.description }}</td>
                </ng-container>

                <ng-container matColumnDef="quantity">
                  <th mat-header-cell *matHeaderCellDef>Quantity</th>
                  <td mat-cell *matCellDef="let item">{{ item.quantity }}</td>
                </ng-container>

                <ng-container matColumnDef="unit">
                  <th mat-header-cell *matHeaderCellDef>Unit</th>
                  <td mat-cell *matCellDef="let item">{{ item.unit }}</td>
                </ng-container>

                <ng-container matColumnDef="unitPrice">
                  <th mat-header-cell *matHeaderCellDef>Unit Price</th>
                  <td mat-cell *matCellDef="let item">{{ formatCurrency(item.unitPrice) }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </div>

            <p class="preview-info">Showing first {{ previewItems.length }} items</p>
          </div>

          <div *ngIf="!parsingSheet && parsedItems.length === 0" class="no-data">
            <mat-icon>warning</mat-icon>
            <p>No valid BOQ items found in the selected sheet</p>
          </div>
        </div>

        <!-- Progress indicator -->
        <div class="step-progress">
          <div
            class="progress-item"
            [class.active]="currentStep >= 1"
            [class.completed]="currentStep > 1"
          >
            <div class="progress-dot">1</div>
            <span>Project</span>
          </div>
          <div class="progress-line" [class.active]="currentStep > 1"></div>
          <div
            class="progress-item"
            [class.active]="currentStep >= 2"
            [class.completed]="currentStep > 2"
          >
            <div class="progress-dot">2</div>
            <span>File</span>
          </div>
          <div class="progress-line" [class.active]="currentStep > 2"></div>
          <div
            class="progress-item"
            [class.active]="currentStep >= 3"
            [class.completed]="currentStep > 3"
          >
            <div class="progress-dot">3</div>
            <span>Sheet</span>
          </div>
          <div class="progress-line" [class.active]="currentStep > 3"></div>
          <div class="progress-item" [class.active]="currentStep >= 4">
            <div class="progress-dot">4</div>
            <span>Import</span>
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-button (click)="previousStep()" *ngIf="currentStep > 1" [disabled]="isProcessing">
        <mat-icon>arrow_back</mat-icon>
        Back
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="nextStep()"
        [disabled]="!canProceed() || isProcessing"
        *ngIf="currentStep < 4"
      >
        Next
        <mat-icon>arrow_forward</mat-icon>
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onImport()"
        [disabled]="!canImport() || importing"
        *ngIf="currentStep === 4"
      >
        <mat-spinner diameter="20" *ngIf="importing"></mat-spinner>
        <span *ngIf="!importing">Import {{ parsedItems.length }} Items</span>
        <span *ngIf="importing">Importing...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .import-wizard {
        min-width: 900px;
        width: 100%;
      }

      .step {
        margin-bottom: 24px;
      }

      .step h3 {
        margin: 0 0 16px;
        color: #333;
      }

      .full-width {
        width: 100%;
      }

      .file-upload-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 32px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
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

      .file-types {
        font-size: 12px;
        margin-top: 4px !important;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .file-details {
        flex: 1;
        text-align: left;
      }

      .file-name {
        margin: 0;
        font-weight: 500;
      }

      .file-size {
        margin: 0;
        font-size: 12px;
        color: #666;
      }

      .loading {
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: center;
        padding: 24px;
      }

      .loading p {
        margin: 0;
        color: #666;
      }

      .sheets-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .sheet-option {
        margin-bottom: 16px;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }

      .sheet-info {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
      }

      .row-count {
        font-size: 12px;
        color: #666;
      }

      .sheet-preview {
        margin-top: 12px;
        overflow-x: auto;
      }

      .sheet-preview table {
        font-size: 11px;
        border-collapse: collapse;
      }

      .sheet-preview td {
        padding: 4px 8px;
        border: 1px solid #e0e0e0;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .preview-section {
        margin-top: 16px;
      }

      .summary {
        font-weight: 500;
        margin-bottom: 16px;
      }

      .table-container {
        max-height: 300px;
        overflow: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .preview-table {
        width: 100%;
      }

      .preview-info {
        font-size: 12px;
        color: #666;
        text-align: right;
        margin: 8px 0 0;
      }

      .no-data {
        text-align: center;
        padding: 48px;
        color: #666;
      }

      .no-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      .step-progress {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #e0e0e0;
      }

      .progress-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        opacity: 0.5;
        transition: opacity 0.3s;
      }

      .progress-item.active {
        opacity: 1;
      }

      .progress-dot {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
        transition: all 0.3s;
      }

      .progress-item.active .progress-dot {
        background: #1976d2;
        color: white;
      }

      .progress-item.completed .progress-dot {
        background: #4caf50;
        color: white;
      }

      .progress-line {
        width: 60px;
        height: 2px;
        background: #e0e0e0;
        transition: background 0.3s;
      }

      .progress-line.active {
        background: #4caf50;
      }

      .progress-item span {
        font-size: 12px;
        color: #666;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        gap: 8px;
      }
    `,
  ],
})
export class BOQImportExcelDialogComponent implements OnInit {
  private boqService = inject(BOQService);
  private excelService = inject(ExcelImportService);
  private dialogRef = inject(MatDialogRef<BOQImportExcelDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as DialogData;

  // Step management
  currentStep = 1;

  // Step 1: Project selection
  projects: Project[] = [];
  selectedProjectId = '';

  // Step 2: File upload
  selectedFile: File | null = null;
  loadingSheets = false;

  // Step 3: Sheet selection
  availableSheets: ExcelSheet[] = [];
  selectedSheet = '';

  // Step 4: Preview & Import
  parsedItems: BOQImportRow[] = [];
  previewItems: BOQImportRow[] = [];
  displayedColumns = ['itemCode', 'description', 'quantity', 'unit', 'unitPrice'];
  parsingSheet = false;
  importing = false;

  isProcessing = false;

  ngOnInit() {
    this.projects = this.data.projects || [];
    if (this.data.selectedProjectId) {
      this.selectedProjectId = this.data.selectedProjectId;
    }
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedProjectId;
      case 2:
        return !!this.selectedFile;
      case 3:
        return !!this.selectedSheet;
      default:
        return false;
    }
  }

  canImport(): boolean {
    return this.parsedItems.length > 0 && !this.importing;
  }

  async nextStep() {
    if (!this.canProceed()) return;

    this.isProcessing = true;

    try {
      switch (this.currentStep) {
        case 1:
          this.currentStep = 2;
          break;

        case 2:
          if (this.selectedFile) {
            await this.loadSheets();
            this.currentStep = 3;
          }
          break;

        case 3:
          if (this.selectedSheet && this.selectedFile) {
            await this.parseSelectedSheet();
            this.currentStep = 4;
          }
          break;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
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
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        this.processFile(file);
      } else {
        alert('Please upload an Excel file (.xlsx or .xls)');
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
    this.availableSheets = [];
    this.selectedSheet = '';
    this.parsedItems = [];
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile = null;
    this.availableSheets = [];
    this.selectedSheet = '';
    this.parsedItems = [];
  }

  async loadSheets() {
    if (!this.selectedFile) return;

    this.loadingSheets = true;
    try {
      this.availableSheets = await this.excelService.readExcelFile(this.selectedFile);

      // Auto-select first sheet or "Master Material List" if found
      if (this.availableSheets.length > 0) {
        const masterSheet = this.availableSheets.find(
          (s) =>
            s.name.toLowerCase().includes('master') || s.name.toLowerCase().includes('material'),
        );
        this.selectedSheet = masterSheet ? masterSheet.name : this.availableSheets[0].name;
      }
    } catch (error) {
      console.error('Error loading sheets:', error);
      alert('Failed to read Excel file');
    } finally {
      this.loadingSheets = false;
    }
  }

  async parseSelectedSheet() {
    if (!this.selectedFile || !this.selectedSheet) return;

    this.parsingSheet = true;
    try {
      this.parsedItems = await this.excelService.parseSheetForBOQ(
        this.selectedFile,
        this.selectedSheet,
      );

      // Set preview items (first 10)
      this.previewItems = this.parsedItems.slice(0, 10);
    } catch (error) {
      console.error('Error parsing sheet:', error);
      alert('Failed to parse BOQ data from the selected sheet');
      this.parsedItems = [];
    } finally {
      this.parsingSheet = false;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatCurrency(value: number): string {
    return `R${value.toFixed(2)}`;
  }

  onCancel() {
    this.dialogRef.close();
  }

  async onImport() {
    if (!this.canImport()) return;

    this.importing = true;

    try {
      // Convert to BOQ items format
      const boqItems: Omit<BOQItem, 'id'>[] = this.parsedItems.map((item) => ({
        projectId: this.selectedProjectId,
        itemCode: item.itemCode,
        description: item.description,
        specification: item.specification || '',
        unit: item.unit,
        requiredQuantity: item.quantity,
        allocatedQuantity: 0,
        remainingQuantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        status: 'Planned',
        needsQuote: item.unitPrice === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Import using BOQ service direct method
      await this.boqService.importBOQItemsDirect(this.selectedProjectId, boqItems).toPromise();

      // Show success and close
      this.importing = false;
      alert(`Successfully imported ${boqItems.length} BOQ items!`);

      this.dialogRef.close({
        success: true,
        itemCount: boqItems.length,
      });
    } catch (error) {
      console.error('Error importing BOQ items:', error);
      // Show more detailed error message
      const errorMessage = (error as Error)?.message || 'Unknown error occurred';
      alert(`Failed to import BOQ items: ${errorMessage}`);
    } finally {
      this.importing = false;
    }
  }
}
