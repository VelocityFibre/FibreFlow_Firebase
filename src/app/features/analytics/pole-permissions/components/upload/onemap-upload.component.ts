import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
  getMetadata,
} from '@angular/fire/storage';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';

interface UploadFile {
  name: string;
  size: number;
  file: File; // Keep reference to actual file
  progress: number;
  status: 'pending' | 'uploading' | 'verifying' | 'complete' | 'error';
  error?: string;
  url?: string;
  retryCount: number;
}

@Component({
  selector: 'app-onemap-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Upload OneMap CSV Files"
      subtitle="Drag and drop CSV files or click to browse"
    ></app-page-header>

    <div class="upload-container">
      <!-- User Status Card -->
      <mat-card class="status-card">
        <mat-card-content>
          <div class="status-info">
            <mat-icon>account_circle</mat-icon>
            @if (currentUser()) {
              <div>
                <strong>Logged in as:</strong> {{ currentUser()?.email }}
                <mat-chip-set>
                  <mat-chip class="status-chip">
                    <mat-icon>check_circle</mat-icon>
                    Ready to upload
                  </mat-chip>
                </mat-chip-set>
              </div>
            } @else {
              <div>
                <strong>Not logged in</strong>
                <mat-chip-set>
                  <mat-chip class="error-chip">
                    <mat-icon>error</mat-icon>
                    Please login first
                  </mat-chip>
                </mat-chip-set>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="upload-card">
        <mat-card-content>
          <div
            class="dropzone"
            [class.dragover]="isDragging()"
            [class.disabled]="!currentUser() || isUploading()"
            (drop)="onDrop($event)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (click)="currentUser() && !isUploading() && fileInput.click()"
          >
            <mat-icon class="upload-icon">cloud_upload</mat-icon>
            @if (!currentUser()) {
              <h2>Please login to upload files</h2>
            } @else if (isUploading()) {
              <h2>Upload in progress...</h2>
              <p>Please wait for current uploads to complete</p>
            } @else {
              <h2>Drop CSV files here</h2>
              <p>or click to browse</p>
            }
            <input
              #fileInput
              type="file"
              accept=".csv"
              multiple
              (change)="onFileSelected($event)"
              style="display: none"
            />
          </div>

          <!-- File List -->
          @if (files().length > 0) {
            <div class="file-list">
              <div class="file-list-header">
                <h3>Files ({{ files().length }})</h3>
                <span class="total-size">Total: {{ formatSize(totalSize()) }}</span>
              </div>

              @for (file of files(); track file.name) {
                <div class="file-item" [class.error-item]="file.status === 'error'">
                  <mat-icon>description</mat-icon>
                  <div class="file-info">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatSize(file.size) }}</span>
                    @if (file.error) {
                      <span class="error-message">{{ file.error }}</span>
                    }
                  </div>

                  @switch (file.status) {
                    @case ('uploading') {
                      <div class="progress-info">
                        <span class="progress-text">{{ file.progress.toFixed(0) }}%</span>
                        <mat-progress-bar
                          mode="determinate"
                          [value]="file.progress"
                        ></mat-progress-bar>
                      </div>
                    }
                    @case ('verifying') {
                      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                      <span class="status-text">Verifying...</span>
                    }
                    @case ('complete') {
                      <mat-icon class="success" matTooltip="Upload successful"
                        >check_circle</mat-icon
                      >
                    }
                    @case ('error') {
                      <button mat-icon-button (click)="retryUpload(file)" matTooltip="Retry upload">
                        <mat-icon class="error">refresh</mat-icon>
                      </button>
                    }
                  }
                </div>
              }

              <div class="actions">
                <button
                  mat-raised-button
                  color="primary"
                  (click)="uploadAll()"
                  [disabled]="!currentUser() || isUploading() || !hasPendingFiles()"
                >
                  @if (isUploading()) {
                    Uploading... ({{ uploadProgress() }}%)
                  } @else {
                    Upload {{ pendingCount() }} File(s)
                  }
                </button>
                <button mat-button (click)="clearCompleted()" [disabled]="isUploading()">
                  Clear Completed
                </button>
                <button mat-button (click)="clearAll()" [disabled]="isUploading()">
                  Clear All
                </button>
              </div>
            </div>
          }

          <!-- Upload Summary -->
          @if (uploadSummary().total > 0) {
            <div class="upload-summary">
              <h4>Upload Summary</h4>
              <div class="summary-stats">
                <div class="stat">
                  <mat-icon class="success">check_circle</mat-icon>
                  <span>{{ uploadSummary().completed }} Completed</span>
                </div>
                <div class="stat">
                  <mat-icon class="error">error</mat-icon>
                  <span>{{ uploadSummary().failed }} Failed</span>
                </div>
                <div class="stat">
                  <mat-icon>pending</mat-icon>
                  <span>{{ uploadSummary().pending }} Pending</span>
                </div>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Instructions -->
      <mat-card class="instructions-card">
        <mat-card-header>
          <mat-card-title>Upload Instructions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <h4>Important:</h4>
          <ul class="important-list">
            <li><strong>One at a time recommended</strong> for large files</li>
            <li><strong>Wait for verification</strong> after each upload</li>
            <li><strong>Don't refresh the page</strong> during uploads</li>
            <li><strong>Keep browser tab active</strong> while uploading</li>
          </ul>

          <h4>Steps:</h4>
          <ol>
            <li>Make sure you're logged in (check top of page)</li>
            <li>Click upload area or drag CSV files</li>
            <li>Click "Upload" button</li>
            <li>Wait for green checkmark ✓ on each file</li>
            <li>If any fail (red ✗), click retry button</li>
          </ol>

          <div class="info-box success-box">
            <mat-icon>verified</mat-icon>
            <p>
              Files are verified after upload to ensure they're safely stored. Only files with green
              checkmarks are successfully uploaded.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .upload-container {
        padding: 24px;
        max-width: 900px;
        margin: 0 auto;
      }

      .status-card {
        margin-bottom: 16px;
        background: var(--mat-sys-surface-variant);
      }

      .status-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .status-chip {
        background: rgba(var(--mat-sys-success-rgb), 0.2);
        color: var(--mat-sys-success);
      }

      .error-chip {
        background: rgba(var(--mat-sys-error-rgb), 0.2);
        color: var(--mat-sys-error);
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
        position: relative;
      }

      .dropzone:hover:not(.disabled) {
        border-color: var(--mat-sys-primary);
        background: rgba(var(--mat-sys-primary-rgb), 0.05);
      }

      .dropzone.dragover {
        border-color: var(--mat-sys-primary);
        background: rgba(var(--mat-sys-primary-rgb), 0.1);
      }

      .dropzone.disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
        border-top: 1px solid var(--mat-sys-outline-variant);
        padding-top: 16px;
      }

      .file-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .file-list h3 {
        margin: 0;
      }

      .total-size {
        font-size: 14px;
        color: var(--mat-sys-on-surface-variant);
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
        transition: all 0.2s ease;
      }

      .file-item.error-item {
        border-color: var(--mat-sys-error);
        background: rgba(var(--mat-sys-error-rgb), 0.05);
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

      .error-message {
        font-size: 12px;
        color: var(--mat-sys-error);
        margin-top: 4px;
      }

      .progress-info {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 120px;
      }

      .progress-text {
        font-size: 12px;
        font-weight: 500;
        min-width: 35px;
      }

      .status-text {
        font-size: 12px;
        color: var(--mat-sys-primary);
        font-weight: 500;
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

      .upload-summary {
        margin-top: 24px;
        padding: 16px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
      }

      .upload-summary h4 {
        margin: 0 0 12px 0;
      }

      .summary-stats {
        display: flex;
        gap: 24px;
      }

      .stat {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .instructions-card {
        h4 {
          margin-top: 16px;
          margin-bottom: 8px;
        }

        ol,
        ul {
          margin: 8px 0;
          padding-left: 24px;
        }

        li {
          margin-bottom: 8px;
        }
      }

      .important-list {
        background: rgba(var(--mat-sys-warning-rgb), 0.1);
        padding: 12px 12px 12px 32px;
        border-radius: 4px;
        margin: 8px 0;
      }

      .info-box {
        display: flex;
        gap: 12px;
        padding: 16px;
        border-radius: 4px;
        margin-top: 16px;

        mat-icon {
          flex-shrink: 0;
        }

        p {
          margin: 0;
        }
      }

      .success-box {
        background: rgba(var(--mat-sys-success-rgb), 0.1);
        color: var(--mat-sys-success);
      }

      mat-progress-bar {
        height: 4px;
        border-radius: 2px;
      }
    `,
  ],
})
export class OnemapUploadComponent {
  private storage = inject(Storage);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private snackBar = inject(MatSnackBar);

  // User state
  currentUser = signal<any>(null);

  constructor() {
    // Subscribe to auth state
    user(this.auth).subscribe((user) => {
      this.currentUser.set(user);
    });
  }

  // File management
  files = signal<UploadFile[]>([]);
  isDragging = signal(false);
  isUploading = signal(false);

  // Computed values
  totalSize = computed(() => this.files().reduce((sum, file) => sum + file.size, 0));

  pendingCount = computed(
    () => this.files().filter((f) => f.status === 'pending' || f.status === 'error').length,
  );

  hasPendingFiles = computed(() => this.pendingCount() > 0);

  uploadProgress = computed(() => {
    const files = this.files();
    if (files.length === 0) return 0;

    const totalProgress = files.reduce((sum, file) => {
      if (file.status === 'complete') return sum + 100;
      if (file.status === 'uploading') return sum + file.progress;
      return sum;
    }, 0);

    return Math.round(totalProgress / files.length);
  });

  uploadSummary = computed(() => {
    const files = this.files();
    return {
      total: files.length,
      completed: files.filter((f) => f.status === 'complete').length,
      failed: files.filter((f) => f.status === 'error').length,
      pending: files.filter((f) => f.status === 'pending').length,
      uploading: files.filter((f) => f.status === 'uploading' || f.status === 'verifying').length,
    };
  });

  // VF OneMap Storage bucket path
  private readonly STORAGE_PATH = 'csv-uploads';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  onDragOver(event: DragEvent): void {
    if (!this.currentUser() || this.isUploading()) return;

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
    if (!this.currentUser() || this.isUploading()) return;

    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(files);
    }
  }

  onFileSelected(event: Event): void {
    if (!this.currentUser() || this.isUploading()) return;

    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
      // Reset input so same file can be selected again
      input.value = '';
    }
  }

  private addFiles(fileList: FileList): void {
    const csvFiles = Array.from(fileList).filter(
      (file) =>
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.toLowerCase().endsWith('.csv'),
    );

    if (csvFiles.length === 0) {
      this.showError('Please select CSV files only');
      return;
    }

    // Check for duplicates
    const existingNames = new Set(this.files().map((f) => f.name));
    const newFiles = csvFiles.filter((file) => {
      if (existingNames.has(file.name)) {
        this.showError(`${file.name} is already in the list`);
        return false;
      }
      return true;
    });

    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      name: file.name,
      size: file.size,
      file: file, // Keep reference to actual File object
      progress: 0,
      status: 'pending',
      retryCount: 0,
    }));

    this.files.update((files) => [...files, ...uploadFiles]);
  }

  async uploadAll(): Promise<void> {
    if (!this.currentUser()) {
      this.showError('Please login first');
      return;
    }

    this.isUploading.set(true);
    const filesToUpload = this.files().filter(
      (f) => f.status === 'pending' || f.status === 'error',
    );

    // Upload sequentially for better reliability
    for (const file of filesToUpload) {
      await this.uploadFile(file);
      // Small delay between uploads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.isUploading.set(false);

    // Show final summary
    const summary = this.uploadSummary();
    if (summary.failed === 0) {
      this.showSuccess(`All ${summary.completed} files uploaded successfully!`);
    } else {
      this.showError(
        `${summary.completed} succeeded, ${summary.failed} failed. Click retry for failed files.`,
      );
    }
  }

  private async uploadFile(uploadFile: UploadFile, isRetry = false): Promise<void> {
    try {
      // Reset error state
      uploadFile.error = undefined;
      uploadFile.status = 'uploading';
      uploadFile.progress = 0;
      this.files.update((files) => [...files]);

      // Create unique filename with timestamp to prevent overwrites
      const timestamp = Date.now();
      const fileName = `${timestamp}_${uploadFile.name}`;
      const storageRef = ref(this.storage, `${this.STORAGE_PATH}/${fileName}`);

      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, uploadFile.file);

      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress update
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadFile.progress = progress;
            this.files.update((files) => [...files]);
          },
          (error) => {
            // Error
            console.error('Upload error:', error);
            reject(error);
          },
          () => {
            // Complete
            resolve();
          },
        );
      });

      // Verify upload was successful
      uploadFile.status = 'verifying';
      this.files.update((files) => [...files]);

      // Get download URL and metadata to verify
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      const metadata = await getMetadata(uploadTask.snapshot.ref);

      // Verify file exists and size matches
      if (metadata.size !== uploadFile.size) {
        throw new Error('File size mismatch after upload');
      }

      // Success!
      uploadFile.status = 'complete';
      uploadFile.url = url;
      uploadFile.progress = 100;
      this.files.update((files) => [...files]);

      // Log successful upload
      await this.logUpload(uploadFile, fileName, url);

      if (!isRetry) {
        this.showSuccess(`${uploadFile.name} uploaded successfully`);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);

      uploadFile.status = 'error';
      uploadFile.error = this.getErrorMessage(error);
      uploadFile.retryCount = isRetry ? uploadFile.retryCount : uploadFile.retryCount + 1;
      this.files.update((files) => [...files]);

      // Auto-retry for certain errors
      if (uploadFile.retryCount < this.MAX_RETRIES && this.shouldRetry(error)) {
        this.showError(
          `${uploadFile.name} failed, retrying... (${uploadFile.retryCount}/${this.MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        return this.uploadFile(uploadFile, true);
      }

      this.showError(`Failed to upload ${uploadFile.name}: ${uploadFile.error}`);
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or timeouts
    return (
      error.code === 'storage/retry-limit-exceeded' ||
      error.code === 'storage/canceled' ||
      error.message?.includes('network') ||
      error.message?.includes('timeout')
    );
  }

  private getErrorMessage(error: any): string {
    if (error.code === 'storage/unauthorized') {
      return 'Permission denied - please login again';
    }
    if (error.code === 'storage/canceled') {
      return 'Upload was canceled';
    }
    if (error.code === 'storage/unknown') {
      return 'Network error - please check connection';
    }
    return error.message || 'Unknown error occurred';
  }

  async retryUpload(file: UploadFile): Promise<void> {
    file.retryCount = 0; // Reset retry count
    await this.uploadFile(file);
  }

  private async logUpload(file: UploadFile, storagePath: string, url: string): Promise<void> {
    try {
      const user = this.currentUser();
      await addDoc(collection(this.firestore, 'upload_logs'), {
        fileName: file.name,
        storagePath: storagePath,
        fileSize: file.size,
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email || 'unknown',
        uploadedByUid: user?.uid || 'unknown',
        storageUrl: url,
        status: 'uploaded',
        processed: false,
        retryCount: file.retryCount,
      });
    } catch (error) {
      console.error('Failed to log upload:', error);
      // Don't fail the upload just because logging failed
    }
  }

  clearCompleted(): void {
    this.files.update((files) => files.filter((f) => f.status !== 'complete'));
  }

  clearAll(): void {
    if (this.isUploading()) {
      this.showError('Cannot clear files while uploading');
      return;
    }
    this.files.set([]);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 10000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }
}
