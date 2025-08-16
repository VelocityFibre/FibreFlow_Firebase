import { Component, inject, signal, computed, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { PhotoCompressionService } from '../../services/photo-compression.service';
import { PhotoUploadService } from '../../services/photo-upload.service';
import { OfflinePhoto } from '../../services/offline-pole.service';

export type PhotoType = 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';

export interface PhotoTypeConfig {
  type: PhotoType;
  label: string;
  icon: string;
  required: boolean;
}

@Component({
  selector: 'app-offline-photo-capture',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
    <div class="photo-capture-container">
      <h3>Capture Photos (Optional)</h3>
      
      <!-- Photo Types -->
      <div class="photo-types">
        @for (config of photoTypes; track config.type) {
          <button
            mat-raised-button
            [color]="selectedType() === config.type ? 'primary' : 'default'"
            [class.has-photo]="hasPhoto(config.type)"
            (click)="selectPhotoType(config.type)"
            class="photo-type-button">
            <mat-icon [matBadge]="getPhotoCount(config.type)" 
                      [matBadgeHidden]="!hasPhoto(config.type)"
                      matBadgeColor="accent"
                      matBadgeSize="small">
              {{ config.icon }}
            </mat-icon>
            <span>{{ config.label }}</span>
          </button>
        }
      </div>

      <!-- Capture Button -->
      <div class="capture-section">
        @if (selectedType()) {
          <input
            #fileInput
            type="file"
            accept="image/*"
            capture="environment"
            (change)="onFileSelected($event)"
            style="display: none">
          
          <button 
            mat-fab 
            extended 
            color="primary"
            (click)="fileInput.click()"
            [disabled]="isProcessing()"
            class="capture-button">
            <mat-icon>camera_alt</mat-icon>
            Capture {{ getSelectedTypeLabel() }}
          </button>
        } @else {
          <p class="hint">Select a photo type to begin</p>
        }
      </div>

      <!-- Preview Section -->
      @if (currentPreview()) {
        <mat-card class="preview-card">
          <img [src]="currentPreview()" alt="Preview" class="preview-image">
          <mat-card-actions>
            <button mat-button (click)="retake()">
              <mat-icon>refresh</mat-icon>
              Retake
            </button>
            <button mat-raised-button color="primary" (click)="savePhoto()">
              <mat-icon>save</mat-icon>
              Save
            </button>
          </mat-card-actions>
          
          @if (compressionInfo()) {
            <div class="compression-info">
              <mat-chip-set>
                <mat-chip>
                  Original: {{ formatSize(compressionInfo()!.originalSize) }}
                </mat-chip>
                <mat-chip [highlighted]="true">
                  Compressed: {{ formatSize(compressionInfo()!.compressedSize) }}
                </mat-chip>
                <mat-chip>
                  Saved: {{ formatSavings() }}%
                </mat-chip>
              </mat-chip-set>
            </div>
          }
        </mat-card>
      }

      <!-- Captured Photos -->
      @if (capturedPhotos().length > 0) {
        <div class="captured-photos">
          <h4>Captured Photos ({{ capturedPhotos().length }})</h4>
          <div class="photo-grid">
            @for (photo of capturedPhotos(); track photo.id) {
              <div class="photo-item" [class]="'upload-' + (photo.uploadStatus || 'pending')">
                <img [src]="photo.data" [alt]="photo.type" class="thumbnail">
                
                <!-- Upload Status Overlay -->
                @if (photo.uploadStatus === 'uploading') {
                  <div class="upload-overlay">
                    <mat-progress-spinner diameter="30" mode="indeterminate"></mat-progress-spinner>
                  </div>
                } @else if (photo.uploadStatus === 'uploaded') {
                  <div class="upload-status uploaded">
                    <mat-icon>cloud_done</mat-icon>
                  </div>
                } @else if (photo.uploadStatus === 'error') {
                  <div class="upload-status error">
                    <mat-icon>cloud_off</mat-icon>
                  </div>
                } @else if (photo.uploadStatus === 'pending') {
                  <div class="upload-status pending">
                    <mat-icon>cloud_queue</mat-icon>
                  </div>
                }
                
                <div class="photo-info">
                  <span class="photo-type">{{ getPhotoTypeLabel(photo.type) }}</span>
                  <span class="photo-size">{{ formatSize(photo.size) }}</span>
                  @if (photo.uploadStatus) {
                    <span class="upload-status-text" [class]="photo.uploadStatus">
                      {{ getUploadStatusText(photo) }}
                    </span>
                  }
                </div>
                <button mat-icon-button 
                        color="warn" 
                        (click)="deletePhoto(photo.id)"
                        class="delete-button">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Processing Indicator -->
      @if (isProcessing()) {
        <div class="processing-overlay">
          <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
          <p>{{ processingMessage() }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .photo-capture-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    h3 {
      margin-bottom: 20px;
      text-align: center;
    }

    .photo-types {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .photo-type-button {
      height: 80px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
      
      &.has-photo {
        border: 2px solid var(--mat-sys-primary);
      }
      
      .required {
        position: absolute;
        top: 4px;
        right: 4px;
        color: var(--mat-sys-error);
      }
    }

    .capture-section {
      text-align: center;
      margin: 32px 0;
    }

    .capture-button {
      width: 200px;
    }

    .hint {
      color: var(--mat-sys-outline);
      font-style: italic;
    }

    .preview-card {
      margin: 24px 0;
      
      .preview-image {
        width: 100%;
        height: auto;
        max-height: 400px;
        object-fit: contain;
      }
      
      mat-card-actions {
        justify-content: space-between;
      }
    }

    .compression-info {
      padding: 8px 16px;
      background: var(--mat-sys-surface-variant);
    }

    .captured-photos {
      margin-top: 32px;
      
      h4 {
        margin-bottom: 16px;
      }
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    }

    .photo-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: var(--mat-sys-elevation-1);
      
      &.upload-uploaded {
        border: 2px solid var(--mat-sys-primary);
      }
      
      &.upload-error {
        border: 2px solid var(--mat-sys-error);
      }
      
      &.upload-uploading {
        border: 2px solid var(--mat-sys-secondary);
      }
      
      .thumbnail {
        width: 100%;
        height: 150px;
        object-fit: cover;
      }
      
      .upload-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }
      
      .upload-status {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        padding: 4px;
        z-index: 1;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
        
        &.uploaded mat-icon {
          color: var(--mat-sys-primary);
        }
        
        &.error mat-icon {
          color: var(--mat-sys-error);
        }
        
        &.pending mat-icon {
          color: var(--mat-sys-outline);
        }
      }
      
      .photo-info {
        padding: 8px;
        background: var(--mat-sys-surface);
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        
        .photo-type {
          font-weight: 500;
        }
        
        .photo-size {
          color: var(--mat-sys-outline);
        }
        
        .upload-status-text {
          font-size: 10px;
          
          &.uploaded {
            color: var(--mat-sys-primary);
          }
          
          &.error {
            color: var(--mat-sys-error);
          }
          
          &.uploading {
            color: var(--mat-sys-secondary);
          }
          
          &.pending {
            color: var(--mat-sys-outline);
          }
        }
      }
      
      .delete-button {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 0, 0, 0.5);
        
        mat-icon {
          color: white;
        }
      }
    }

    .processing-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 1000;
      
      p {
        color: white;
      }
    }

    @media (max-width: 480px) {
      .photo-types {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OfflinePhotoCaptureComponent {
  @Input() existingPhotos: OfflinePhoto[] = [];
  @Output() photosChanged = new EventEmitter<OfflinePhoto[]>();

  private photoCompressionService = inject(PhotoCompressionService);
  private photoUploadService = inject(PhotoUploadService);

  photoTypes: PhotoTypeConfig[] = [
    { type: 'before', label: 'Before', icon: 'landscape', required: false },
    { type: 'front', label: 'Front', icon: 'photo_camera', required: false },
    { type: 'side', label: 'Side', icon: 'switch_camera', required: false },
    { type: 'depth', label: 'Depth', icon: 'straighten', required: false },
    { type: 'concrete', label: 'Concrete', icon: 'foundation', required: false },
    { type: 'compaction', label: 'Compaction', icon: 'compress', required: false }
  ];

  selectedType = signal<PhotoType | null>(null);
  currentPreview = signal<string | null>(null);
  currentFile = signal<File | null>(null);
  capturedPhotos = signal<OfflinePhoto[]>(this.existingPhotos);
  isProcessing = signal(false);
  processingMessage = signal('');
  compressionInfo = signal<{ originalSize: number; compressedSize: number } | null>(null);

  ngOnInit() {
    if (this.existingPhotos.length > 0) {
      this.capturedPhotos.set(this.existingPhotos);
    }
  }

  selectPhotoType(type: PhotoType): void {
    this.selectedType.set(type);
    this.currentPreview.set(null);
    this.currentFile.set(null);
    this.compressionInfo.set(null);
  }

  hasPhoto(type: PhotoType): boolean {
    return this.capturedPhotos().some(photo => photo.type === type);
  }

  getPhotoCount(type: PhotoType): string {
    const count = this.capturedPhotos().filter(photo => photo.type === type).length;
    return count > 0 ? count.toString() : '';
  }

  getSelectedTypeLabel(): string {
    const config = this.photoTypes.find(t => t.type === this.selectedType());
    return config?.label || '';
  }

  getPhotoTypeLabel(type: PhotoType): string {
    const config = this.photoTypes.find(t => t.type === type);
    return config?.label || type;
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file || !this.selectedType()) return;

    this.isProcessing.set(true);
    this.processingMessage.set('Compressing photo...');

    try {
      // Compress the image
      const compressed = await this.photoCompressionService.compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8
      });

      // Convert to base64 for preview and storage
      const base64 = await this.photoCompressionService.compressImageToBase64(compressed);

      this.currentFile.set(file);
      this.currentPreview.set(base64);
      this.compressionInfo.set({
        originalSize: file.size,
        compressedSize: compressed.size
      });
    } catch (error) {
      console.error('Error processing photo:', error);
      this.processingMessage.set('Error processing photo');
    } finally {
      this.isProcessing.set(false);
      // Reset input
      input.value = '';
    }
  }

  async savePhoto(): Promise<void> {
    if (!this.currentPreview() || !this.selectedType()) return;

    const photo: OfflinePhoto = {
      id: this.generateId(),
      data: this.currentPreview()!,
      type: this.selectedType()!,
      timestamp: new Date(),
      size: this.compressionInfo()?.compressedSize || 0,
      compressed: true,
      uploadStatus: 'pending'
    };

    // Add photo to captured photos immediately
    const updated = [...this.capturedPhotos(), photo];
    this.capturedPhotos.set(updated);
    this.photosChanged.emit(updated);

    // Reset preview
    this.currentPreview.set(null);
    this.currentFile.set(null);
    this.compressionInfo.set(null);

    // Try to upload immediately if online
    if (this.photoUploadService.isOnline()) {
      this.uploadPhotoImmediately(photo);
    } else {
      // Queue for upload when online
      this.photoUploadService.queueForUpload(photo);
      this.updatePhotoUploadStatus(photo.id, 'pending', 'Will upload when online');
    }
  }

  private async uploadPhotoImmediately(photo: OfflinePhoto): Promise<void> {
    try {
      // Update status to uploading
      this.updatePhotoUploadStatus(photo.id, 'uploading');

      // Upload to Firebase Storage
      const uploadUrl = await this.photoUploadService.uploadPhotoImmediately(photo);
      
      // Update photo with upload URL
      this.updatePhotoUploadStatus(photo.id, 'uploaded', undefined, uploadUrl);
    } catch (error) {
      console.error('Failed to upload photo immediately:', error);
      
      // Update status to error and queue for retry
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.updatePhotoUploadStatus(photo.id, 'error', errorMessage);
      this.photoUploadService.queueForUpload(photo);
    }
  }

  private updatePhotoUploadStatus(
    photoId: string, 
    status: OfflinePhoto['uploadStatus'],
    error?: string,
    url?: string
  ): void {
    const photos = this.capturedPhotos();
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, uploadStatus: status, uploadError: error, uploadUrl: url }
        : photo
    );
    this.capturedPhotos.set(updatedPhotos);
    this.photosChanged.emit(updatedPhotos);
  }

  retake(): void {
    this.currentPreview.set(null);
    this.currentFile.set(null);
    this.compressionInfo.set(null);
  }

  deletePhoto(id: string): void {
    const updated = this.capturedPhotos().filter(photo => photo.id !== id);
    this.capturedPhotos.set(updated);
    this.photosChanged.emit(updated);
  }

  formatSize(bytes: number): string {
    return this.photoCompressionService.formatFileSize(bytes);
  }

  formatSavings(): string {
    const info = this.compressionInfo();
    if (!info) return '0';
    
    const savings = ((info.originalSize - info.compressedSize) / info.originalSize) * 100;
    return savings.toFixed(0);
  }

  getUploadStatusText(photo: OfflinePhoto): string {
    switch (photo.uploadStatus) {
      case 'uploaded':
        return 'Uploaded';
      case 'uploading':
        return 'Uploading...';
      case 'error':
        return photo.uploadError || 'Upload failed';
      case 'pending':
        return 'Queued';
      default:
        return 'Not uploaded';
    }
  }

  private generateId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRequiredPhotosStatus(): { complete: boolean; missing: PhotoType[] } {
    const requiredTypes = this.photoTypes.filter(t => t.required).map(t => t.type);
    const capturedTypes = new Set(this.capturedPhotos().map(p => p.type));
    const missing = requiredTypes.filter(type => !capturedTypes.has(type));
    
    return {
      complete: missing.length === 0,
      missing
    };
  }
}