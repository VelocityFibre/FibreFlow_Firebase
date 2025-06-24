import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImageUploadService, UploadProgress } from '../../services/image-upload.service';
import { ImageUpload } from '../../models/pole-tracker.model';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <mat-card class="upload-card">
      <mat-card-header>
        <mat-card-title>{{ title }}</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <!-- Preview or Upload Area -->
        <div class="upload-area" [class.has-image]="imageUrl()">
          @if (imageUrl()) {
            <div class="image-preview">
              <img [src]="imageUrl()" [alt]="title" (click)="viewFullImage()">
              <div class="image-actions">
                <button mat-icon-button matTooltip="View" (click)="viewFullImage()">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteImage()">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          } @else {
            <div class="upload-placeholder" (click)="fileInput.click()">
              <mat-icon class="upload-icon">cloud_upload</mat-icon>
              <p>Click to upload or drag and drop</p>
              <p class="file-hint">JPG, PNG up to 10MB</p>
            </div>
          }
        </div>

        <!-- Upload Progress -->
        @if (uploadProgress()) {
          <div class="upload-progress">
            <mat-progress-bar 
              mode="determinate" 
              [value]="uploadProgress()!.progress"
              [color]="uploadProgress()!.state === 'error' ? 'warn' : 'primary'">
            </mat-progress-bar>
            <span class="progress-text">
              @if (uploadProgress()!.state === 'uploading') {
                Uploading... {{ uploadProgress()!.progress }}%
              } @else if (uploadProgress()!.state === 'error') {
                Error: {{ uploadProgress()!.error }}
              }
            </span>
          </div>
        }

        <!-- Hidden File Input -->
        <input 
          #fileInput
          type="file"
          accept="image/*"
          [attr.capture]="isMobile ? 'environment' : null"
          (change)="onFileSelected($event)"
          style="display: none">

        <!-- Upload Button (when no image) -->
        @if (!imageUrl()) {
          <button 
            mat-raised-button 
            color="primary" 
            (click)="fileInput.click()"
            [disabled]="isUploading()">
            <mat-icon>add_a_photo</mat-icon>
            {{ isMobile ? 'Take Photo' : 'Choose File' }}
          </button>
        }

        <!-- Status Indicators -->
        <div class="status-row">
          @if (currentUpload?.uploaded) {
            <mat-icon color="primary" matTooltip="Image uploaded">check_circle</mat-icon>
          }
          @if (currentUpload?.approved) {
            <mat-icon color="accent" matTooltip="Image approved">verified</mat-icon>
          }
          @if (uploadDate()) {
            <span class="upload-date">Uploaded: {{ uploadDate() | date:'short' }}</span>
          }
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .upload-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    mat-card-header {
      background-color: #f5f5f5;
      margin: -16px -16px 16px -16px;
      padding: 12px 16px;
    }

    mat-card-title {
      font-size: 16px;
      margin: 0;
    }

    .upload-area {
      min-height: 200px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .upload-area:hover {
      border-color: #3f51b5;
      background-color: #f8f9fa;
    }

    .upload-area.has-image {
      border-style: solid;
      cursor: default;
      padding: 0;
    }

    .upload-placeholder {
      text-align: center;
      padding: 24px;
      color: #666;
    }

    .upload-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: #999;
      margin-bottom: 8px;
    }

    .file-hint {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }

    .image-preview {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 200px;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 6px;
      cursor: pointer;
    }

    .image-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 4px;
      padding: 4px;
    }

    .image-actions button {
      width: 32px;
      height: 32px;
      color: white;
    }

    .upload-progress {
      margin: 16px 0;
    }

    .progress-text {
      font-size: 12px;
      color: #666;
      display: block;
      margin-top: 4px;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .upload-date {
      margin-left: auto;
    }

    @media (max-width: 600px) {
      .upload-area {
        min-height: 150px;
      }
    }
  `]
})
export class ImageUploadComponent {
  private imageUploadService = inject(ImageUploadService);
  
  @Input() title: string = 'Image Upload';
  @Input() poleId?: string;
  @Input() uploadType: string = 'general';
  @Input() currentUpload?: ImageUpload;
  @Output() uploadComplete = new EventEmitter<ImageUpload>();
  @Output() uploadError = new EventEmitter<string>();

  imageUrl = signal<string>('');
  uploadProgress = signal<UploadProgress | null>(null);
  isUploading = signal(false);
  
  isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  ngOnInit() {
    if (this.currentUpload?.url) {
      this.imageUrl.set(this.currentUpload.url);
    }
  }

  uploadDate() {
    if (!this.currentUpload?.uploadedAt) return null;
    
    // Handle Firestore Timestamp
    if (typeof this.currentUpload.uploadedAt === 'object' && 'toDate' in this.currentUpload.uploadedAt) {
      return this.currentUpload.uploadedAt.toDate();
    }
    
    return this.currentUpload.uploadedAt;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    
    // Validate file
    const validation = this.imageUploadService.validateImageFile(file);
    if (!validation.valid) {
      this.uploadError.emit(validation.error);
      return;
    }

    // Upload file
    this.uploadFile(file);
  }

  private uploadFile(file: File) {
    if (!this.poleId) {
      this.uploadError.emit('Pole ID is required for upload');
      return;
    }

    this.isUploading.set(true);
    
    this.imageUploadService.uploadPoleImage(file, this.poleId, this.uploadType)
      .subscribe({
        next: (progress) => {
          this.uploadProgress.set(progress);
          
          if (progress.state === 'complete' && progress.downloadUrl) {
            this.imageUrl.set(progress.downloadUrl);
            this.isUploading.set(false);
            
            const uploadData: ImageUpload = {
              url: progress.downloadUrl,
              uploaded: true,
              uploadedAt: new Date()
            };
            
            this.uploadComplete.emit(uploadData);
            
            // Clear progress after a delay
            setTimeout(() => {
              this.uploadProgress.set(null);
            }, 2000);
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.isUploading.set(false);
          this.uploadError.emit(error.message || 'Upload failed');
        }
      });
  }

  viewFullImage() {
    if (this.imageUrl()) {
      window.open(this.imageUrl(), '_blank');
    }
  }

  deleteImage() {
    if (confirm('Are you sure you want to delete this image?')) {
      if (this.imageUrl()) {
        this.imageUploadService.deleteImage(this.imageUrl()).subscribe({
          next: () => {
            this.imageUrl.set('');
            const uploadData: ImageUpload = {
              uploaded: false
            };
            this.uploadComplete.emit(uploadData);
          },
          error: (error) => {
            console.error('Delete error:', error);
            this.uploadError.emit('Failed to delete image');
          }
        });
      }
    }
  }
}