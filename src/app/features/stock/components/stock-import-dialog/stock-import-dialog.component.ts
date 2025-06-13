import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';

import { StockService } from '../../services/stock.service';
import { StockItemImport } from '../../models/stock-item.model';

interface ParsedItem extends StockItemImport {
  row: number;
  errors: string[];
}

@Component({
  selector: 'app-stock-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatStepperModule,
    MatCardModule,
  ],
  template: `
    <h2 mat-dialog-title>Import Stock Items</h2>

    <mat-dialog-content>
      <mat-stepper #stepper linear>
        <!-- Step 1: Upload File -->
        <mat-step [completed]="fileUploaded">
          <ng-template matStepLabel>Upload CSV File</ng-template>

          <div class="upload-section">
            <div class="upload-instructions">
              <h3>Instructions</h3>
              <p>Upload a CSV file with the following columns:</p>
              <ul>
                <li><strong>itemCode</strong> - Unique item code</li>
                <li><strong>name</strong> - Item name (required)</li>
                <li><strong>description</strong> - Item description</li>
                <li><strong>category</strong> - Category (fibre_cable, poles, equipment, etc.)</li>
                <li><strong>subcategory</strong> - Optional subcategory</li>
                <li><strong>unitOfMeasure</strong> - Unit (meters, units, pieces, etc.)</li>
                <li><strong>currentStock</strong> - Current stock quantity</li>
                <li><strong>minimumStock</strong> - Minimum stock level</li>
                <li><strong>reorderLevel</strong> - Reorder level</li>
                <li><strong>standardCost</strong> - Standard cost per unit</li>
                <li><strong>warehouseLocation</strong> - Storage location</li>
              </ul>

              <button mat-button color="primary" (click)="downloadTemplate()">
                <mat-icon>download</mat-icon>
                Download Template
              </button>
            </div>

            <div
              class="upload-area"
              [class.drag-over]="isDragOver"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <input
                type="file"
                #fileInput
                accept=".csv"
                (change)="onFileSelected($event)"
                style="display: none"
              />

              <div class="upload-content" *ngIf="!selectedFile">
                <mat-icon>cloud_upload</mat-icon>
                <p>Drag and drop your CSV file here or</p>
                <button mat-raised-button color="primary" (click)="fileInput.click()">
                  Browse Files
                </button>
              </div>

              <div class="file-info" *ngIf="selectedFile">
                <mat-icon>insert_drive_file</mat-icon>
                <div>
                  <p class="file-name">{{ selectedFile.name }}</p>
                  <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button mat-icon-button (click)="removeFile()">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </div>

            <div class="stepper-actions">
              <button
                mat-raised-button
                color="primary"
                [disabled]="!selectedFile || parsing"
                (click)="parseFile()"
              >
                <mat-spinner diameter="20" *ngIf="parsing"></mat-spinner>
                <span *ngIf="!parsing">Parse File</span>
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 2: Review Data -->
        <mat-step [completed]="dataReviewed">
          <ng-template matStepLabel>Review Data</ng-template>

          <div class="review-section">
            <div class="review-summary">
              <mat-chip-set>
                <mat-chip color="primary">
                  <mat-icon>check_circle</mat-icon>
                  {{ validItems.length }} Valid Items
                </mat-chip>
                <mat-chip color="warn" *ngIf="invalidItems.length > 0">
                  <mat-icon>error</mat-icon>
                  {{ invalidItems.length }} Invalid Items
                </mat-chip>
              </mat-chip-set>
            </div>

            <mat-card *ngIf="invalidItems.length > 0" class="errors-card">
              <mat-card-header>
                <mat-card-title>Validation Errors</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="error-list">
                  <div class="error-item" *ngFor="let item of invalidItems">
                    <strong>Row {{ item.row }}:</strong>
                    <ul>
                      <li *ngFor="let error of item.errors">{{ error }}</li>
                    </ul>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="preview-table" *ngIf="validItems.length > 0">
              <h3>Preview (first 10 items)</h3>
              <table mat-table [dataSource]="previewItems">
                <ng-container matColumnDef="itemCode">
                  <th mat-header-cell *matHeaderCellDef>Code</th>
                  <td mat-cell *matCellDef="let item">{{ item.itemCode }}</td>
                </ng-container>

                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let item">{{ item.name }}</td>
                </ng-container>

                <ng-container matColumnDef="category">
                  <th mat-header-cell *matHeaderCellDef>Category</th>
                  <td mat-cell *matCellDef="let item">{{ item.category }}</td>
                </ng-container>

                <ng-container matColumnDef="currentStock">
                  <th mat-header-cell *matHeaderCellDef>Stock</th>
                  <td mat-cell *matCellDef="let item">{{ item.currentStock }}</td>
                </ng-container>

                <ng-container matColumnDef="standardCost">
                  <th mat-header-cell *matHeaderCellDef>Cost</th>
                  <td mat-cell *matCellDef="let item">\${{ item.standardCost }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="previewColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: previewColumns"></tr>
              </table>
            </div>

            <div class="stepper-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button
                mat-raised-button
                color="primary"
                [disabled]="validItems.length === 0"
                matStepperNext
                (click)="dataReviewed = true"
              >
                Continue to Import
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 3: Import -->
        <mat-step>
          <ng-template matStepLabel>Import</ng-template>

          <div class="import-section">
            <div *ngIf="!importing && !importComplete" class="import-ready">
              <mat-icon color="primary">info</mat-icon>
              <h3>Ready to Import</h3>
              <p>{{ validItems.length }} items will be imported.</p>

              <div class="stepper-actions">
                <button mat-button matStepperPrevious>Back</button>
                <button mat-raised-button color="primary" (click)="importItems()">
                  Start Import
                </button>
              </div>
            </div>

            <div *ngIf="importing" class="import-progress">
              <mat-spinner></mat-spinner>
              <h3>Importing items...</h3>
              <p>Please wait while we import your stock items.</p>
            </div>

            <div *ngIf="importComplete" class="import-complete">
              <mat-icon color="primary" class="success-icon">check_circle</mat-icon>
              <h3>Import Complete!</h3>
              <p>Successfully imported {{ importResult?.success }} items.</p>
              <ng-container
                *ngIf="importResult && importResult.errors && importResult.errors.length > 0"
              >
                <div class="import-errors">
                  <p>{{ importResult.errors.length }} items failed to import:</p>
                  <ul>
                    <li *ngFor="let error of importResult.errors">{{ error }}</li>
                  </ul>
                </div>
              </ng-container>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>

    <mat-dialog-actions align="end" *ngIf="importComplete">
      <button mat-raised-button color="primary" (click)="close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-height: 400px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .upload-section,
      .review-section,
      .import-section {
        padding: 24px 0;
      }

      .upload-instructions {
        margin-bottom: 24px;
      }

      .upload-instructions h3 {
        margin: 0 0 16px 0;
      }

      .upload-instructions ul {
        margin: 8px 0;
        padding-left: 20px;
      }

      .upload-instructions li {
        margin: 4px 0;
      }

      .upload-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 48px;
        text-align: center;
        transition: all 0.3s ease;
        background-color: #fafafa;
      }

      .upload-area.drag-over {
        border-color: #1976d2;
        background-color: #e3f2fd;
      }

      .upload-content mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #999;
        margin-bottom: 16px;
      }

      .upload-content p {
        color: #666;
        margin-bottom: 16px;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: white;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }

      .file-info mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #1976d2;
      }

      .file-name {
        font-weight: 500;
        margin: 0;
      }

      .file-size {
        color: #666;
        font-size: 14px;
        margin: 4px 0 0 0;
      }

      .stepper-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      .review-summary {
        margin-bottom: 24px;
      }

      .errors-card {
        margin-bottom: 24px;
        background-color: #fff3e0;
      }

      .error-list {
        max-height: 200px;
        overflow-y: auto;
      }

      .error-item {
        margin-bottom: 12px;
        padding: 8px;
        background: white;
        border-radius: 4px;
      }

      .error-item ul {
        margin: 4px 0 0 0;
        padding-left: 20px;
      }

      .preview-table {
        margin-top: 24px;
      }

      .preview-table h3 {
        margin: 0 0 16px 0;
      }

      .preview-table table {
        width: 100%;
        background: white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .import-ready,
      .import-progress,
      .import-complete {
        text-align: center;
        padding: 48px;
      }

      .import-ready mat-icon,
      .import-complete mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }

      .success-icon {
        color: #4caf50 !important;
      }

      .import-errors {
        margin-top: 16px;
        padding: 16px;
        background-color: #ffebee;
        border-radius: 4px;
        text-align: left;
      }

      .import-errors ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }

      mat-spinner {
        margin: 0 auto 16px;
      }
    `,
  ],
})
export class StockImportDialogComponent {
  private stockService = inject(StockService);
  public dialogRef = inject(MatDialogRef<StockImportDialogComponent>);

  // File upload
  selectedFile: File | null = null;
  isDragOver = false;
  fileUploaded = false;

  // Parsing
  parsing = false;
  parsedItems: ParsedItem[] = [];
  validItems: ParsedItem[] = [];
  invalidItems: ParsedItem[] = [];
  previewItems: ParsedItem[] = [];
  previewColumns = ['itemCode', 'name', 'category', 'currentStock', 'standardCost'];

  // Review
  dataReviewed = false;

  // Import
  importing = false;
  importComplete = false;
  importResult: { success: number; errors: string[] } | null = null;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    this.selectedFile = file;
    this.fileUploaded = true;
  }

  removeFile() {
    this.selectedFile = null;
    this.fileUploaded = false;
    this.parsedItems = [];
    this.validItems = [];
    this.invalidItems = [];
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  }

  async parseFile() {
    if (!this.selectedFile) return;

    this.parsing = true;

    try {
      const text = await this.selectedFile.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim());

      this.parsedItems = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const item = this.createItemFromRow(headers, values, i + 1);
        this.parsedItems.push(item);
      }

      // Validate items
      this.validItems = this.parsedItems.filter((item) => item.errors.length === 0);
      this.invalidItems = this.parsedItems.filter((item) => item.errors.length > 0);

      // Set preview items (first 10 valid items)
      this.previewItems = this.validItems.slice(0, 10);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format and try again.');
    } finally {
      this.parsing = false;
    }
  }

  parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  createItemFromRow(headers: string[], values: string[], row: number): ParsedItem {
    const item: ParsedItem = {
      row,
      errors: [],
      itemCode: '',
      name: '',
      category: '',
      unitOfMeasure: '',
      currentStock: 0,
      minimumStock: 0,
      reorderLevel: 0,
      standardCost: 0,
    };

    // Map values to item properties
    headers.forEach((header, index) => {
      const value = values[index] || '';

      switch (header.toLowerCase()) {
        case 'itemcode':
        case 'item_code':
        case 'code':
          item.itemCode = value;
          break;
        case 'name':
        case 'item_name':
          item.name = value;
          break;
        case 'description':
          item.description = value;
          break;
        case 'category':
          item.category = value.toLowerCase().replace(/\s+/g, '_');
          break;
        case 'subcategory':
        case 'sub_category':
          item.subcategory = value;
          break;
        case 'unitofmeasure':
        case 'unit_of_measure':
        case 'unit':
          item.unitOfMeasure = value.toLowerCase().replace(/\s+/g, '_');
          break;
        case 'currentstock':
        case 'current_stock':
        case 'stock':
          item.currentStock = parseFloat(value) || 0;
          break;
        case 'minimumstock':
        case 'minimum_stock':
        case 'min_stock':
          item.minimumStock = parseFloat(value) || 0;
          break;
        case 'reorderlevel':
        case 'reorder_level':
          item.reorderLevel = parseFloat(value) || 0;
          break;
        case 'standardcost':
        case 'standard_cost':
        case 'cost':
          item.standardCost = parseFloat(value) || 0;
          break;
        case 'warehouselocation':
        case 'warehouse_location':
        case 'location':
          item.warehouseLocation = value;
          break;
      }
    });

    // Validate required fields
    if (!item.itemCode) item.errors.push('Item code is required');
    if (!item.name) item.errors.push('Name is required');
    if (!item.category) item.errors.push('Category is required');
    if (!item.unitOfMeasure) item.errors.push('Unit of measure is required');

    // Validate numeric fields
    if (item.currentStock < 0) item.errors.push('Current stock cannot be negative');
    if (item.minimumStock < 0) item.errors.push('Minimum stock cannot be negative');
    if (item.reorderLevel < 0) item.errors.push('Reorder level cannot be negative');
    if (item.standardCost < 0) item.errors.push('Standard cost cannot be negative');

    return item;
  }

  downloadTemplate() {
    const template = `itemCode,name,description,category,subcategory,unitOfMeasure,currentStock,minimumStock,reorderLevel,standardCost,warehouseLocation
FIB-001,Single Mode Fiber Cable,9/125 OS2 fiber optic cable,fibre_cable,Indoor,meters,5000,1000,2000,12.50,A-12-3
POL-001,Wooden Pole 9m,Treated wooden pole 9 meters,poles,Wooden,units,50,10,20,450.00,Yard-B
EQP-001,Fiber Splice Closure,24 core splice closure,equipment,Closures,units,25,5,10,85.00,C-5-2`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stock_items_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async importItems() {
    this.importing = true;

    try {
      const itemsToImport = this.validItems.map(({ row: _row, errors: _errors, ...item }) => item);
      this.importResult = await this.stockService.importStockItems(itemsToImport);
      this.importComplete = true;
    } catch (error) {
      alert('Error importing items. Please try again.');
    } finally {
      this.importing = false;
    }
  }

  close() {
    if (this.importComplete && this.importResult) {
      this.dialogRef.close(this.importResult);
    } else {
      this.dialogRef.close();
    }
  }
}
