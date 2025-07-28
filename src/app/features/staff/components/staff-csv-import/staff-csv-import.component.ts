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
import { MatSnackBar } from '@angular/material/snack-bar';

import { StaffService } from '../../services/staff.service';
import { StaffMember, StaffGroup } from '../../models/staff.model';

interface ParsedStaffMember {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  primaryGroup: StaffGroup;
  position?: string;
  roleId?: string;
  skills?: string[];
  certifications?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  row: number;
  errors: string[];
}

@Component({
  selector: 'app-staff-csv-import',
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
    <h2 mat-dialog-title>Import Staff Members</h2>

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
                <li><strong>employeeId</strong> - Unique employee identifier (required)</li>
                <li><strong>name</strong> - Full name (required)</li>
                <li><strong>email</strong> - Email address (required)</li>
                <li><strong>phone</strong> - Phone number (required)</li>
                <li>
                  <strong>primaryGroup</strong> - Staff group: Management, Regional Project Manager,
                  Project Manager, Site Supervisor, Senior Technician, Assistant Technician, Planner
                  (required)
                </li>
                <li><strong>position</strong> - Job position/title (optional)</li>
                <li><strong>roleId</strong> - System role ID (optional)</li>
                <li><strong>skills</strong> - Comma-separated skills in quotes (optional)</li>
                <li>
                  <strong>certifications</strong> - Comma-separated certifications in quotes
                  (optional)
                </li>
                <li><strong>emergencyContactName</strong> - Emergency contact name (optional)</li>
                <li><strong>emergencyContactPhone</strong> - Emergency contact phone (optional)</li>
                <li><strong>emergencyContactRelationship</strong> - Relationship (optional)</li>
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
                  {{ validStaff.length }} Valid Staff Members
                </mat-chip>
                <mat-chip color="warn" *ngIf="invalidStaff.length > 0">
                  <mat-icon>error</mat-icon>
                  {{ invalidStaff.length }} Invalid Staff Members
                </mat-chip>
              </mat-chip-set>
            </div>

            <mat-card *ngIf="invalidStaff.length > 0" class="errors-card">
              <mat-card-header>
                <mat-card-title>Validation Errors</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="error-list">
                  <div class="error-item" *ngFor="let staff of invalidStaff">
                    <strong>Row {{ staff.row }}:</strong>
                    <ul>
                      <li *ngFor="let error of staff.errors">{{ error }}</li>
                    </ul>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <div class="stepper-actions">
              <button mat-button (click)="stepper.previous()">Back</button>
              <button
                mat-raised-button
                color="primary"
                [disabled]="validStaff.length === 0"
                (click)="proceedToImport()"
              >
                Continue with {{ validStaff.length }} Valid Staff Members
              </button>
            </div>
          </div>
        </mat-step>

        <!-- Step 3: Import -->
        <mat-step>
          <ng-template matStepLabel>Import Staff Members</ng-template>

          <div class="import-section">
            <div class="import-progress">
              <mat-progress-spinner
                *ngIf="importing"
                mode="indeterminate"
                diameter="50"
              ></mat-progress-spinner>
              <div class="import-status">
                <h3>{{ importing ? 'Importing...' : 'Import Complete' }}</h3>
                <p>{{ importStatusText }}</p>
              </div>
            </div>

            <div class="import-results" *ngIf="!importing">
              <mat-chip-set>
                <mat-chip color="primary">
                  <mat-icon>check_circle</mat-icon>
                  {{ importedCount }} Imported
                </mat-chip>
                <mat-chip color="warn" *ngIf="failedCount > 0">
                  <mat-icon>error</mat-icon>
                  {{ failedCount }} Failed
                </mat-chip>
              </mat-chip-set>
            </div>

            <div class="stepper-actions">
              <button mat-button (click)="stepper.previous()" [disabled]="importing">Back</button>
              <button
                mat-raised-button
                color="primary"
                [disabled]="importing || importedCount === 0"
                (click)="startImport()"
              >
                Start Import
              </button>
            </div>
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-button (click)="dialogRef.close()" [disabled]="importing">
        {{ importing ? 'Importing...' : 'Close' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .upload-section {
        padding: 20px;
      }

      .upload-instructions {
        margin-bottom: 20px;
      }

      .upload-instructions ul {
        padding-left: 20px;
      }

      .upload-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 40px;
        text-align: center;
        margin: 20px 0;
        transition: all 0.3s ease;
      }

      .upload-area.drag-over {
        border-color: #3f51b5;
        background-color: #f5f5f5;
      }

      .upload-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .file-name {
        font-weight: 500;
        margin: 0;
      }

      .file-size {
        color: #666;
        font-size: 0.9em;
        margin: 0;
      }

      .stepper-actions {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        margin-top: 20px;
      }

      .review-section {
        padding: 20px;
      }

      .review-summary {
        margin-bottom: 20px;
      }

      .errors-card {
        margin-bottom: 20px;
      }

      .error-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .error-item {
        margin-bottom: 16px;
        padding: 8px;
        background: #fff3e0;
        border-radius: 4px;
      }

      .error-item ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
      }

      .import-section {
        padding: 20px;
        text-align: center;
      }

      .import-progress {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
      }

      .import-status h3 {
        margin: 0;
      }

      .import-results {
        margin-bottom: 20px;
      }
    `,
  ],
})
export class StaffCsvImportComponent {
  private staffService = inject(StaffService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<StaffCsvImportComponent>);

  selectedFile: File | null = null;
  fileUploaded = false;
  parsing = false;
  dataReviewed = false;
  importing = false;
  isDragOver = false;

  parsedStaff: ParsedStaffMember[] = [];
  validStaff: ParsedStaffMember[] = [];
  invalidStaff: ParsedStaffMember[] = [];

  importedCount = 0;
  failedCount = 0;
  importStatusText = '';

  // Valid staff groups
  validGroups: StaffGroup[] = [
    'Management',
    'Regional Project Manager',
    'Project Manager',
    'Site Supervisor',
    'Senior Technician',
    'Assistant Technician',
    'Planner',
  ];

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  private handleFileSelection(file: File) {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      this.selectedFile = file;
      this.fileUploaded = true;
    } else {
      this.snackBar.open('Please select a CSV file', 'Close', { duration: 3000 });
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.fileUploaded = false;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async parseFile() {
    if (!this.selectedFile) return;

    this.parsing = true;
    this.parsedStaff = [];
    this.validStaff = [];
    this.invalidStaff = [];

    try {
      const text = await this.readFile(this.selectedFile);
      const lines = text.split('\n').filter((line) => line.trim() !== '');

      if (lines.length < 2) {
        this.snackBar.open('CSV file must have at least a header row and one data row', 'Close', {
          duration: 5000,
        });
        this.parsing = false;
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

      // Validate required headers
      const requiredHeaders = ['employeeId', 'name', 'email', 'phone', 'primaryGroup'];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        this.snackBar.open(`Missing required headers: ${missingHeaders.join(', ')}`, 'Close', {
          duration: 5000,
        });
        this.parsing = false;
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCsvRow(lines[i]);
        const staff = this.parseStaffRow(row, headers, i + 1);
        this.parsedStaff.push(staff);
      }

      // Separate valid and invalid staff
      this.validStaff = this.parsedStaff.filter((s) => s.errors.length === 0);
      this.invalidStaff = this.parsedStaff.filter((s) => s.errors.length > 0);

      this.snackBar.open(
        `Parsed ${this.validStaff.length} valid and ${this.invalidStaff.length} invalid staff members`,
        'Close',
        { duration: 3000 },
      );
    } catch (error) {
      console.error('Error parsing CSV:', error);
      this.snackBar.open('Error parsing CSV file', 'Close', { duration: 5000 });
    }

    this.parsing = false;
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private parseStaffRow(row: string[], headers: string[], rowNumber: number): ParsedStaffMember {
    const staff: ParsedStaffMember = {
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      primaryGroup: 'Management',
      row: rowNumber,
      errors: [],
    };

    // Map CSV values to staff object
    headers.forEach((header, index) => {
      const value = row[index]?.trim().replace(/"/g, '') || '';

      switch (header) {
        case 'employeeId':
          staff.employeeId = value;
          break;
        case 'name':
          staff.name = value;
          break;
        case 'email':
          staff.email = value;
          break;
        case 'phone':
          staff.phone = value;
          break;
        case 'primaryGroup':
          staff.primaryGroup = value as StaffGroup;
          break;
        case 'position':
          staff.position = value;
          break;
        case 'roleId':
          staff.roleId = value;
          break;
        case 'skills':
          staff.skills = value ? value.split(',').map((s) => s.trim()) : [];
          break;
        case 'certifications':
          staff.certifications = value ? value.split(',').map((c) => c.trim()) : [];
          break;
        case 'emergencyContactName':
          staff.emergencyContactName = value;
          break;
        case 'emergencyContactPhone':
          staff.emergencyContactPhone = value;
          break;
        case 'emergencyContactRelationship':
          staff.emergencyContactRelationship = value;
          break;
      }
    });

    // Validate staff data
    this.validateStaffData(staff);

    return staff;
  }

  private validateStaffData(staff: ParsedStaffMember) {
    // Required field validation
    if (!staff.employeeId) {
      staff.errors.push('Employee ID is required');
    }

    if (!staff.name) {
      staff.errors.push('Name is required');
    }

    if (!staff.email) {
      staff.errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff.email)) {
      staff.errors.push('Invalid email format');
    }

    if (!staff.phone) {
      staff.errors.push('Phone number is required');
    }

    if (!this.validGroups.includes(staff.primaryGroup)) {
      staff.errors.push(`Invalid primary group. Must be one of: ${this.validGroups.join(', ')}`);
    }
  }

  proceedToImport() {
    this.dataReviewed = true;
  }

  async startImport() {
    this.importing = true;
    this.importedCount = 0;
    this.failedCount = 0;
    this.importStatusText = `Importing ${this.validStaff.length} staff members...`;

    for (const [index, staffData] of this.validStaff.entries()) {
      try {
        // Create staff member object
        const newStaff: Partial<StaffMember> = {
          employeeId: staffData.employeeId,
          name: staffData.name,
          email: staffData.email,
          phone: staffData.phone,
          primaryGroup: staffData.primaryGroup,
          position: staffData.position,
          roleId: staffData.roleId,
          skills: staffData.skills || [],
          certifications: staffData.certifications || [],
          emergencyContact: staffData.emergencyContactName
            ? {
                name: staffData.emergencyContactName,
                phone: staffData.emergencyContactPhone || '',
                relationship: staffData.emergencyContactRelationship || '',
              }
            : undefined,
          isActive: true,
          availability: {
            status: 'available',
            workingHours: {},
            currentTaskCount: 0,
            maxConcurrentTasks: 5,
          },
          activity: {
            lastLogin: null,
            lastActive: null,
            tasksCompleted: 0,
            tasksInProgress: 0,
            tasksFlagged: 0,
            totalProjectsWorked: 0,
            averageTaskCompletionTime: 0,
          },
        };

        await this.staffService.createStaff(newStaff as StaffMember).toPromise();
        this.importedCount++;
        this.importStatusText = `Imported ${this.importedCount} of ${this.validStaff.length} staff members...`;
      } catch (error) {
        console.error(`Failed to import staff member ${staffData.name}:`, error);
        this.failedCount++;
      }
    }

    this.importing = false;
    this.importStatusText = `Import complete! ${this.importedCount} staff members imported successfully.`;

    if (this.failedCount > 0) {
      this.importStatusText += ` ${this.failedCount} imports failed.`;
    }

    this.snackBar.open(this.importStatusText, 'Close', { duration: 5000 });
  }

  downloadTemplate() {
    const template = `employeeId,name,email,phone,primaryGroup,position,roleId,skills,certifications,emergencyContactName,emergencyContactPhone,emergencyContactRelationship
VF001,John Doe,john.doe@example.com,+27 82 123 4567,Project Manager,Project Manager,pm,"Project Management,Leadership","PMP,Prince2",Jane Doe,+27 82 987 6543,Spouse
VF002,Jane Smith,jane.smith@example.com,+27 83 234 5678,Senior Technician,Field Technician,engineer,"Fiber Optic Installation,Cable Splicing","Fiber Optic Certification,Safety Training",John Smith,+27 83 876 5432,Spouse
VF003,Mike Johnson,mike.johnson@example.com,+27 84 345 6789,Management,Administrator,admin,"Data Entry,Customer Service","Office Administration,MS Office",Sarah Johnson,+27 84 765 4321,Spouse`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
