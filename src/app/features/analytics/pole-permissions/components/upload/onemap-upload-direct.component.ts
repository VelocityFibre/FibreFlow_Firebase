import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

interface UploadFile {
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  content?: string;
}

@Component({
  selector: 'app-onemap-upload-direct',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Upload OneMap CSV Files (Direct)"
      subtitle="Upload CSV files directly to database - no storage permissions needed"
    ></app-page-header>

    <div class="upload-container">
      <mat-card class="upload-card">
        <mat-card-content>
          <div 
            class="dropzone"
            [class.dragover]="isDragging()"
            (drop)="onDrop($event)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (click)="fileInput.click()"
          >
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            <h2>Drop CSV files here</h2>
            <p>or click to browse</p>
            <input 
              #fileInput 
              type="file" 
              accept=".csv" 
              multiple 
              (change)="onFileSelected($event)"
              style="display: none"
            >
          </div>

          <!-- File List -->
          @if (files().length > 0) {
            <div class="file-list">
              <h3>Files to Upload</h3>
              @for (file of files(); track file.name) {
                <div class="file-item">
                  <mat-icon>description</mat-icon>
                  <div class="file-info">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatSize(file.size) }}</span>
                  </div>
                  
                  @if (file.status === 'uploading') {
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="file.progress"
                    ></mat-progress-bar>
                  }
                  
                  @if (file.status === 'complete') {
                    <mat-icon class="success">check_circle</mat-icon>
                  }
                  
                  @if (file.status === 'error') {
                    <mat-icon class="error">error</mat-icon>
                  }
                </div>
              }
              
              <div class="actions">
                <button 
                  mat-raised-button 
                  color="primary"
                  (click)="uploadAll()"
                  [disabled]="isUploading()"
                >
                  Upload All Files
                </button>
                <button 
                  mat-button 
                  (click)="clearFiles()"
                  [disabled]="isUploading()"
                >
                  Clear
                </button>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Instructions -->
      <mat-card class="instructions-card">
        <mat-card-header>
          <mat-card-title>Direct Upload - No Storage Permissions Needed!</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="info-message">
            <mat-icon>info</mat-icon>
            This upload method sends CSV data directly to the database, 
            bypassing Firebase Storage permissions.
          </p>
          
          <h4>How it works:</h4>
          <ol>
            <li>Select or drag CSV files</li>
            <li>Files are read in your browser</li>
            <li>Data is sent directly to Firestore</li>
            <li>No storage permissions required!</li>
          </ol>
          
          <div class="info-box">
            <mat-icon>security</mat-icon>
            <p>
              Your data is secure. Files are processed in your browser 
              and sent directly to the VF OneMap database.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .upload-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .upload-card {
      margin-bottom: 24px;
    }

    .dropzone {
      border: 2px dashed var(--mat-sys-outline);
      border-radius: 8px;
      padding: 48px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: var(--mat-sys-surface-variant);
    }

    .dropzone:hover {
      border-color: var(--mat-sys-primary);
      background: rgba(var(--mat-sys-primary-rgb), 0.05);
    }

    .dropzone.dragover {
      border-color: var(--mat-sys-primary);
      background: rgba(var(--mat-sys-primary-rgb), 0.1);
    }

    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-sys-primary);
      margin-bottom: 16px;
    }

    .file-list {
      margin-top: 24px;
    }

    .file-list h3 {
      margin-bottom: 16px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 4px;
      margin-bottom: 8px;
      position: relative;
    }

    .file-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .file-name {
      font-weight: 500;
    }

    .file-size {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .success {
      color: var(--mat-sys-success);
    }

    .error {
      color: var(--mat-sys-error);
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .instructions-card {
      mat-card-header {
        margin-bottom: 16px;
      }
      
      ol {
        margin: 16px 0;
        padding-left: 24px;
      }
      
      li {
        margin-bottom: 8px;
      }
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: var(--mat-sys-surface-variant);
      border-radius: 4px;
      margin-top: 16px;
      
      mat-icon {
        color: var(--mat-sys-primary);
      }
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(var(--mat-sys-primary-rgb), 0.1);
      border-radius: 4px;
      margin-bottom: 16px;
      
      mat-icon {
        color: var(--mat-sys-primary);
      }
    }

    mat-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
  `],
})
export class OnemapUploadDirectComponent {
  private firestore = inject(Firestore);
  private snackBar = inject(MatSnackBar);

  files = signal<UploadFile[]>([]);
  isDragging = signal(false);
  isUploading = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(files);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
    }
  }

  private addFiles(fileList: FileList): void {
    const csvFiles = Array.from(fileList).filter(file => 
      file.type === 'text/csv' || file.name.endsWith('.csv')
    );

    const newFiles: UploadFile[] = csvFiles.map(file => ({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
    }));

    this.files.update(files => [...files, ...newFiles]);

    // Read file contents
    csvFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.files.update(files => {
          const updated = [...files];
          const fileIndex = files.findIndex(f => f.name === file.name);
          if (fileIndex >= 0) {
            updated[fileIndex].content = content;
          }
          return updated;
        });
      };
      reader.readAsText(file);
    });
  }

  async uploadAll(): Promise<void> {
    this.isUploading.set(true);
    const filesToUpload = this.files().filter(f => f.status === 'pending' && f.content);

    for (const file of filesToUpload) {
      await this.uploadFile(file);
    }

    this.isUploading.set(false);
    this.showSuccess('All files uploaded successfully!');
  }

  private async uploadFile(uploadFile: UploadFile): Promise<void> {
    try {
      // Update status
      uploadFile.status = 'uploading';
      uploadFile.progress = 20;
      this.files.update(files => [...files]);

      if (!uploadFile.content) {
        throw new Error('File content not loaded');
      }

      // Create upload document
      const uploadData = {
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        content: uploadFile.content,
        uploadedAt: new Date(),
        uploadedBy: 'louisrdup@gmail.com', // In production, get from auth
        status: 'uploaded',
        processed: false,
        rowCount: uploadFile.content.split('\n').length - 1
      };

      uploadFile.progress = 60;
      this.files.update(files => [...files]);

      // Save to Firestore
      await addDoc(collection(this.firestore, 'csv_uploads'), uploadData);

      uploadFile.progress = 100;
      uploadFile.status = 'complete';
      this.files.update(files => [...files]);

    } catch (error) {
      console.error('Upload error:', error);
      uploadFile.status = 'error';
      this.files.update(files => [...files]);
      this.showError(`Failed to upload ${uploadFile.name}`);
    }
  }

  clearFiles(): void {
    this.files.set([]);
  }

  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }
}