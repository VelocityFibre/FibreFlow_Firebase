import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { 
  Storage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL,
  getMetadata
} from '@angular/fire/storage';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';

interface UploadImageFile {
  name: string;
  size: number;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'verifying' | 'complete' | 'error';
  error?: string;
  url?: string;
  retryCount: number;
}

interface ImageBatch {
  site: string;
  project: string;
  uploadDate: Date;
  userId: string;
  totalImages: number;
  completedImages: number;
  status: 'uploading' | 'completed' | 'failed';
}

@Component({
  selector: 'app-bulk-image-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Bulk Image Upload"
      subtitle="Upload pole photos with GPS metadata for processing"
    ></app-page-header>

    <div class="upload-container">
      <!-- Debug Panel (remove when working) -->
      @if (debugInfo().length > 0) {
        <mat-card class="debug-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>bug_report</mat-icon>
              Debug Information
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="debug-info">
              @for (info of debugInfo(); track $index) {
                <div class="debug-line">{{ info }}</div>
              }
              @if (lastError()) {
                <div class="error-line">
                  <mat-icon>error</mat-icon>
                  <strong>Last Error:</strong> {{ lastError() }}
                </div>
              }
            </div>
            <div class="debug-status">
              <strong>Status Check:</strong>
              <span>Initialized: {{ isInitialized() ? '✅' : '❌' }}</span>
              <span>User: {{ currentUser()?.email || '❌ None' }}</span>
              <span>Site Name: {{ siteName || '❌ Empty' }}</span>
              <span>Can Upload: {{ canUpload() ? '✅' : '❌' }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- User Status & Batch Info Card -->
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

      <!-- Site & Project Labeling -->
      <mat-card class="labeling-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>label</mat-icon>
            Label Your Images
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="labeling-form">
            <mat-form-field appearance="outline" class="site-field">
              <mat-label>Site Name *</mat-label>
              <input 
                matInput 
                [(ngModel)]="siteName" 
                placeholder="e.g., Lawley, Johannesburg Central"
                [disabled]="isUploading()"
                required
              >
              <mat-hint>Required - Where are these poles located?</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="project-field">
              <mat-label>Project Name</mat-label>
              <input 
                matInput 
                [(ngModel)]="projectName" 
                placeholder="e.g., Fiber Installation Phase 2"
                [disabled]="isUploading()"
              >
              <mat-hint>Optional - Project or campaign name</mat-hint>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Upload Area -->
      <mat-card class="upload-card">
        <mat-card-content>
          <div 
            class="dropzone"
            [class.dragover]="isDragging()"
            [class.disabled]="!canUpload()"
            (drop)="onDrop($event)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (click)="canUpload() && fileInput.click()"
          >
            <mat-icon class="upload-icon">add_photo_alternate</mat-icon>
            @if (!currentUser()) {
              <h2>🔐 Please login to upload images</h2>
              <p>Sign in with your Google account to continue</p>
            } @else if (!siteName || siteName.trim() === '') {
              <h2>📝 Enter site name first</h2>
              <p><strong>Required:</strong> Fill in the "Site Name" field above to organize your images</p>
            } @else if (isUploading()) {
              <h2>⏳ Upload in progress...</h2>
              <p>Please wait for current uploads to complete</p>
            } @else {
              <h2>📷 Drop pole photos here</h2>
              <p>or <strong>click to browse</strong> (JPG, PNG, HEIC supported)</p>
              <small>Perfect for GPS Map Camera photos with coordinates</small>
            }
            <input 
              #fileInput 
              type="file" 
              accept="image/*,.jpg,.jpeg,.png,.heic"
              multiple 
              (change)="onFileSelected($event)"
              style="display: none"
            >
          </div>

          <!-- File List -->
          @if (files().length > 0) {
            <div class="file-list">
              <div class="file-list-header">
                <h3>Images ({{ files().length }})</h3>
                <span class="total-size">Total: {{ formatSize(totalSize()) }}</span>
              </div>
              
              @for (file of files(); track file.name) {
                <div class="file-item" [class.error-item]="file.status === 'error'">
                  <mat-icon>image</mat-icon>
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
                      <mat-icon class="success" matTooltip="Upload successful">check_circle</mat-icon>
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
                  [disabled]="!canStartUpload()"
                >
                  @if (isUploading()) {
                    Uploading... ({{ uploadProgress() }}%)
                  } @else {
                    Upload {{ pendingCount() }} Image(s)
                  }
                </button>
                <button 
                  mat-button 
                  (click)="clearCompleted()"
                  [disabled]="isUploading()"
                >
                  Clear Completed
                </button>
                <button 
                  mat-button 
                  (click)="clearAll()"
                  [disabled]="isUploading()"
                >
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
              
              @if (uploadSummary().completed > 0 && uploadSummary().pending === 0) {
                <div class="next-steps">
                  <mat-icon>info</mat-icon>
                  <p>
                    <strong>Ready for Phase 2:</strong> Your images are stored and ready for GPS data extraction.
                    Contact support when ready to process {{ uploadSummary().completed }} images.
                  </p>
                </div>
              }
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
          <h4>Supported Image Types:</h4>
          <ul class="image-types">
            <li><strong>JPG/JPEG</strong> - Most common camera format</li>
            <li><strong>PNG</strong> - High quality screenshots</li>
            <li><strong>HEIC</strong> - iPhone photos</li>
            <li><strong>GPS Map Camera</strong> - Perfect for coordinate extraction</li>
          </ul>
          
          <h4>Important Notes:</h4>
          <ul class="important-list">
            <li><strong>Site name is required</strong> - Helps organize your photos</li>
            <li><strong>Keep GPS metadata</strong> - Don't edit photos before upload</li>
            <li><strong>Wi-Fi recommended</strong> for large batches (278 photos)</li>
            <li><strong>Don't close browser</strong> during upload</li>
          </ul>
          
          <h4>Steps:</h4>
          <ol>
            <li>Enter site name (required) and project name (optional)</li>
            <li>Drag & drop your pole photos or click to browse</li>
            <li>Click "Upload" and wait for green checkmarks ✓</li>
            <li>Phase 2: Contact support for GPS data extraction</li>
          </ol>
          
          <div class="info-box success-box">
            <mat-icon>verified</mat-icon>
            <p>
              Images are verified after upload and organized by site/project for easy processing.
              Your GPS metadata is preserved for coordinate extraction in Phase 2.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .upload-container {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .status-card, .labeling-card, .upload-card, .instructions-card {
      margin-bottom: 24px;
    }

    .status-card {
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

    .labeling-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .labeling-form {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .site-field, .project-field {
      flex: 1;
      min-width: 250px;
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
      margin-bottom: 16px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .next-steps {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(var(--mat-sys-success-rgb), 0.1);
      border-radius: 4px;
      border-left: 4px solid var(--mat-sys-success);
    }

    .next-steps mat-icon {
      color: var(--mat-sys-success);
      flex-shrink: 0;
    }

    .next-steps p {
      margin: 0;
      color: var(--mat-sys-success);
    }

    .instructions-card {
      h4 {
        margin-top: 16px;
        margin-bottom: 8px;
      }
      
      ol, ul {
        margin: 8px 0;
        padding-left: 24px;
      }
      
      li {
        margin-bottom: 8px;
      }
    }

    .image-types {
      background: rgba(var(--mat-sys-primary-rgb), 0.1);
      padding: 12px 12px 12px 32px;
      border-radius: 4px;
      margin: 8px 0;
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
  `],
})
export class BulkImageUploadComponent {
  private storage = inject(Storage);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private snackBar = inject(MatSnackBar);

  // User state
  currentUser = signal<any>(null);
  
  // Labeling inputs
  siteName = '';
  projectName = '';
  
  // Debug and error state
  debugInfo = signal<string[]>([]);
  lastError = signal<string | null>(null);
  isInitialized = signal(false);
  
  constructor() {
    this.addDebugInfo('🚀 BulkImageUploadComponent initializing...');
    
    // Subscribe to auth state
    user(this.auth).subscribe(user => {
      this.currentUser.set(user);
      if (user) {
        this.addDebugInfo(`✅ User authenticated: ${user.email}`);
        this.testFirebaseConnection();
      } else {
        this.addDebugInfo('❌ No user authenticated');
      }
    });
    
    this.isInitialized.set(true);
    this.addDebugInfo('✅ Component initialized');
  }
  
  private addDebugInfo(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔧 Upload Debug:', debugMessage);
    this.debugInfo.update(info => [...info.slice(-9), debugMessage]); // Keep last 10 messages
  }
  
  private async testFirebaseConnection(): Promise<void> {
    try {
      this.addDebugInfo('🧪 Testing Firebase Storage connection...');
      
      // Test storage access
      const testRef = ref(this.storage, 'test-connection');
      this.addDebugInfo('✅ Storage reference created successfully');
      
      // Test Firestore access
      const testDoc = await addDoc(collection(this.firestore, 'connection-test'), {
        test: true,
        timestamp: new Date(),
        user: this.currentUser()?.email || 'unknown'
      });
      this.addDebugInfo('✅ Firestore write test successful');
      
      this.lastError.set(null);
    } catch (error: any) {
      const errorMsg = `Firebase connection failed: ${error.message}`;
      this.addDebugInfo(`❌ ${errorMsg}`);
      this.lastError.set(errorMsg);
      this.showError(`Connection test failed: ${error.message}`);
    }
  }

  // File management
  files = signal<UploadImageFile[]>([]);
  isDragging = signal(false);
  isUploading = signal(false);

  // Computed values
  totalSize = computed(() => 
    this.files().reduce((sum, file) => sum + file.size, 0)
  );

  pendingCount = computed(() => 
    this.files().filter(f => f.status === 'pending' || f.status === 'error').length
  );

  hasPendingFiles = computed(() => this.pendingCount() > 0);

  canUpload(): boolean {
    const hasUser = !!this.currentUser();
    const notUploading = !this.isUploading();
    const hasSiteName = this.siteName && this.siteName.trim().length > 0;
    
    console.log('🔍 canUpload check:', {
      hasUser,
      notUploading,
      hasSiteName,
      siteName: this.siteName,
      result: hasUser && notUploading && hasSiteName
    });
    
    return hasUser && notUploading && hasSiteName;
  }

  canStartUpload = computed(() => 
    this.canUpload() && this.hasPendingFiles()
  );

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
      completed: files.filter(f => f.status === 'complete').length,
      failed: files.filter(f => f.status === 'error').length,
      pending: files.filter(f => f.status === 'pending').length,
      uploading: files.filter(f => f.status === 'uploading' || f.status === 'verifying').length
    };
  });

  // Storage configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  private getStoragePath(): string {
    const site = this.siteName.trim().replace(/[^a-zA-Z0-9\s-_]/g, '');
    const project = this.projectName.trim().replace(/[^a-zA-Z0-9\s-_]/g, '') || 'general';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `images/pole-photos/${site}/${project}/batch-${timestamp}`;
  }

  onDragOver(event: DragEvent): void {
    if (!this.canUpload()) return;
    
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
    
    console.log('📁 Drop event triggered', {
      canUpload: this.canUpload(),
      user: this.currentUser()?.email,
      siteName: this.siteName,
      isUploading: this.isUploading()
    });
    
    if (!this.siteName || this.siteName.trim() === '') {
      this.showError('Please enter a site name before uploading files');
      return;
    }
    
    if (!this.currentUser()) {
      this.showError('Please sign in to upload images');
      return;
    }
    
    if (this.isUploading()) {
      this.showError('Please wait for current upload to complete');
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      console.log(`📁 Processing ${files.length} dropped files`);
      this.addFiles(files);
    } else {
      console.log('❌ No files in drop event');
      this.showError('No files were dropped. Please try again.');
    }
  }

  onFileSelected(event: Event): void {
    console.log('📂 File input triggered');
    
    if (!this.siteName || this.siteName.trim() === '') {
      this.showError('Please enter a site name before selecting files');
      return;
    }
    
    if (!this.currentUser()) {
      this.showError('Please sign in to upload images');
      return;
    }
    
    if (this.isUploading()) {
      this.showError('Please wait for current upload to complete');
      return;
    }
    
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      console.log(`📂 Processing ${input.files.length} selected files`);
      this.addFiles(input.files);
      // Reset input so same file can be selected again
      input.value = '';
    } else {
      console.log('❌ No files selected');
      this.showError('No files were selected. Please try again.');
    }
  }

  private addFiles(fileList: FileList): void {
    this.addDebugInfo(`🔍 Analyzing ${fileList.length} files`);
    
    // Log each file for debugging
    Array.from(fileList).forEach((file, index) => {
      this.addDebugInfo(`File ${index + 1}: ${file.name} (${file.type}, ${this.formatSize(file.size)})`);
    });
    
    const imageFiles = Array.from(fileList).filter(file => {
      const isImage = file.type.startsWith('image/') || 
                     /\.(jpg|jpeg|png|heic|webp)$/i.test(file.name);
      if (!isImage) {
        this.addDebugInfo(`❌ Rejected non-image: ${file.name} (${file.type})`);
      }
      return isImage;
    });

    this.addDebugInfo(`✅ Found ${imageFiles.length} valid image files out of ${fileList.length} total`);

    if (imageFiles.length === 0) {
      this.addDebugInfo('❌ No valid image files found');
      this.showError('Please select image files only (JPG, PNG, HEIC)');
      return;
    }

    // Check for duplicates
    const existingNames = new Set(this.files().map(f => f.name));
    const newFiles = imageFiles.filter(file => {
      if (existingNames.has(file.name)) {
        this.addDebugInfo(`❌ Duplicate file: ${file.name}`);
        this.showError(`${file.name} is already in the list`);
        return false;
      }
      return true;
    });

    this.addDebugInfo(`📝 Adding ${newFiles.length} new files to upload queue`);

    const uploadFiles: UploadImageFile[] = newFiles.map(file => ({
      name: file.name,
      size: file.size,
      file: file,
      progress: 0,
      status: 'pending',
      retryCount: 0
    }));

    this.files.update(files => [...files, ...uploadFiles]);
  }

  async uploadAll(): Promise<void> {
    if (!this.canStartUpload()) {
      this.showError('Please ensure you are logged in and have entered a site name');
      return;
    }

    this.isUploading.set(true);
    
    // Create batch record
    const batchId = await this.createBatch();
    
    const filesToUpload = this.files().filter(f => 
      f.status === 'pending' || f.status === 'error'
    );

    // Upload sequentially for better reliability
    for (const file of filesToUpload) {
      await this.uploadFile(file, batchId);
      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isUploading.set(false);
    
    // Update batch record
    await this.updateBatch(batchId);
    
    // Show final summary
    const summary = this.uploadSummary();
    if (summary.failed === 0) {
      this.showSuccess(`All ${summary.completed} images uploaded successfully! Ready for Phase 2 processing.`);
    } else {
      this.showError(`${summary.completed} succeeded, ${summary.failed} failed. Click retry for failed images.`);
    }
  }

  private async createBatch(): Promise<string> {
    try {
      const user = this.currentUser();
      const batchData: ImageBatch = {
        site: this.siteName.trim(),
        project: this.projectName.trim() || 'General',
        uploadDate: new Date(),
        userId: user?.uid || 'unknown',
        totalImages: this.files().length,
        completedImages: 0,
        status: 'uploading'
      };

      const docRef = await addDoc(collection(this.firestore, 'image-batches'), {
        ...batchData,
        uploadDate: serverTimestamp(),
        userEmail: user?.email || 'unknown'
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to create batch:', error);
      return 'unknown-batch';
    }
  }

  private async updateBatch(batchId: string): Promise<void> {
    try {
      const summary = this.uploadSummary();
      await addDoc(collection(this.firestore, 'image-batches'), {
        id: batchId,
        completedImages: summary.completed,
        status: summary.failed > 0 ? 'failed' : 'completed',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update batch:', error);
    }
  }

  private async uploadFile(uploadFile: UploadImageFile, batchId: string, isRetry = false): Promise<void> {
    try {
      // Reset error state
      uploadFile.error = undefined;
      uploadFile.status = 'uploading';
      uploadFile.progress = 0;
      this.files.update(files => [...files]);

      // Create unique filename with timestamp
      const timestamp = Date.now();
      const fileName = `${timestamp}_${uploadFile.name}`;
      const storagePath = this.getStoragePath();
      const storageRef = ref(this.storage, `${storagePath}/${fileName}`);
      
      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, uploadFile.file);

      // Wait for upload to complete
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Progress update
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadFile.progress = progress;
            this.files.update(files => [...files]);
          },
          (error) => {
            // Error
            console.error('Upload error:', error);
            reject(error);
          },
          () => {
            // Complete
            resolve();
          }
        );
      });

      // Verify upload was successful
      uploadFile.status = 'verifying';
      this.files.update(files => [...files]);

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
      this.files.update(files => [...files]);

      // Log successful upload
      await this.logUpload(uploadFile, fileName, url, batchId);
      
      if (!isRetry) {
        this.showSuccess(`${uploadFile.name} uploaded successfully`);
      }

    } catch (error: any) {
      console.error('Upload failed:', error);
      
      uploadFile.status = 'error';
      uploadFile.error = this.getErrorMessage(error);
      uploadFile.retryCount = isRetry ? uploadFile.retryCount : uploadFile.retryCount + 1;
      this.files.update(files => [...files]);

      // Auto-retry for certain errors
      if (uploadFile.retryCount < this.MAX_RETRIES && this.shouldRetry(error)) {
        this.showError(`${uploadFile.name} failed, retrying... (${uploadFile.retryCount}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.uploadFile(uploadFile, batchId, true);
      }

      this.showError(`Failed to upload ${uploadFile.name}: ${uploadFile.error}`);
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or timeouts
    return error.code === 'storage/retry-limit-exceeded' ||
           error.code === 'storage/canceled' ||
           error.message?.includes('network') ||
           error.message?.includes('timeout');
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

  async retryUpload(file: UploadImageFile): Promise<void> {
    file.retryCount = 0; // Reset retry count
    const batchId = 'retry-batch'; // Could track active batch ID
    await this.uploadFile(file, batchId);
  }

  private async logUpload(file: UploadImageFile, storagePath: string, url: string, batchId: string): Promise<void> {
    try {
      const user = this.currentUser();
      await addDoc(collection(this.firestore, 'uploaded-images'), {
        fileName: file.name,
        storagePath: storagePath,
        fileSize: file.size,
        batchId: batchId,
        site: this.siteName.trim(),
        project: this.projectName.trim() || 'General',
        uploadedAt: serverTimestamp(),
        uploadedBy: user?.email || 'unknown',
        uploadedByUid: user?.uid || 'unknown',
        firebaseStorageUrl: url,
        status: 'uploaded',
        processed: false,
        retryCount: file.retryCount,
        metadata: {
          type: file.file.type,
          lastModified: file.file.lastModified
        }
      });
    } catch (error) {
      console.error('Failed to log upload:', error);
      // Don't fail the upload just because logging failed
    }
  }

  clearCompleted(): void {
    this.files.update(files => 
      files.filter(f => f.status !== 'complete')
    );
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