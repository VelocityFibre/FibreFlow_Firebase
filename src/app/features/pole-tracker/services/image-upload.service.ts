import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '@angular/fire/storage';
import { Observable, from, map, switchMap, BehaviorSubject } from 'rxjs';

export interface UploadProgress {
  progress: number;
  state: 'pending' | 'uploading' | 'complete' | 'error';
  downloadUrl?: string;
  error?: string;
}

export interface ImageMetadata {
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  mimeType: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private storage = inject(Storage);
  private maxImageSize = 2 * 1024 * 1024; // 2MB
  private thumbnailSize = 200; // 200px square

  /**
   * Compress image to specified quality or size
   */
  private async compressImage(
    file: File,
    maxSizeMB: number = 2,
    quality: number = 0.8,
  ): Promise<{ blob: Blob; metadata: Partial<ImageMetadata> }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          // Calculate new dimensions maintaining aspect ratio
          let { width, height } = img;
          const maxDimension = 1920; // Max width/height

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const metadata: Partial<ImageMetadata> = {
                originalSize: file.size,
                compressedSize: blob.size,
                width,
                height,
                mimeType: blob.type,
              };

              // If still too large, reduce quality further
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
                canvas.toBlob(
                  (blob2) => {
                    if (blob2) {
                      metadata.compressedSize = blob2.size;
                      resolve({ blob: blob2, metadata });
                    } else {
                      resolve({ blob, metadata });
                    }
                  },
                  'image/jpeg',
                  quality - 0.1,
                );
              } else {
                resolve({ blob, metadata });
              }
            },
            'image/jpeg',
            quality,
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate thumbnail for preview
   */
  private async generateThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;

          // Calculate crop for square thumbnail
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          canvas.width = this.thumbnailSize;
          canvas.height = this.thumbnailSize;

          ctx.drawImage(img, x, y, size, size, 0, 0, this.thumbnailSize, this.thumbnailSize);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to generate thumbnail'));
              }
            },
            'image/jpeg',
            0.7,
          );
        };

        img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file for thumbnail'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Extract GPS data from image EXIF (if available)
   */
  private async extractGPSData(
    file: File,
  ): Promise<{ latitude: number; longitude: number } | null> {
    // This is a placeholder - in production you'd use a library like exif-js
    // For now, we'll return null
    return null;
  }

  /**
   * Upload image with compression and progress tracking
   */
  uploadPoleImage(file: File, poleId: string, uploadType: string): Observable<UploadProgress> {
    const progressSubject = new BehaviorSubject<UploadProgress>({
      progress: 0,
      state: 'pending',
    });

    // Start upload process
    from(this.processAndUpload(file, poleId, uploadType)).subscribe({
      next: (result) => {
        progressSubject.next({
          progress: 100,
          state: 'complete',
          downloadUrl: result.downloadUrl,
        });
        progressSubject.complete();
      },
      error: (error) => {
        progressSubject.next({
          progress: 0,
          state: 'error',
          error: error.message,
        });
        progressSubject.error(error);
      },
    });

    return progressSubject.asObservable();
  }

  /**
   * Process and upload image with thumbnail
   */
  private async processAndUpload(
    file: File,
    poleId: string,
    uploadType: string,
  ): Promise<{ downloadUrl: string; thumbnailUrl: string; metadata: ImageMetadata }> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Compress image if needed
    let uploadBlob: Blob = file;
    let metadata: Partial<ImageMetadata> = {
      originalSize: file.size,
      mimeType: file.type,
    };

    if (file.size > this.maxImageSize) {
      const compressed = await this.compressImage(file);
      uploadBlob = compressed.blob;
      metadata = { ...metadata, ...compressed.metadata };
    }

    // Generate thumbnail
    const thumbnailBlob = await this.generateThumbnail(file);

    // Extract GPS data if available
    const gpsData = await this.extractGPSData(file);
    if (gpsData) {
      metadata.gps = gpsData;
    }

    // Upload main image
    const mainImagePath = `pole-tracker/${poleId}/${uploadType}_${Date.now()}.jpg`;
    const mainImageRef = ref(this.storage, mainImagePath);
    const mainUploadTask = await uploadBytesResumable(mainImageRef, uploadBlob);
    const downloadUrl = await getDownloadURL(mainUploadTask.ref);

    // Upload thumbnail
    const thumbnailPath = `pole-tracker/${poleId}/${uploadType}_thumb_${Date.now()}.jpg`;
    const thumbnailRef = ref(this.storage, thumbnailPath);
    const thumbnailUploadTask = await uploadBytesResumable(thumbnailRef, thumbnailBlob);
    const thumbnailUrl = await getDownloadURL(thumbnailUploadTask.ref);

    return {
      downloadUrl,
      thumbnailUrl,
      metadata: metadata as ImageMetadata,
    };
  }

  /**
   * Delete image from storage
   */
  deleteImage(imageUrl: string): Observable<void> {
    try {
      const imageRef = ref(this.storage, imageUrl);
      return from(deleteObject(imageRef));
    } catch (error) {
      console.error('Error deleting image:', error);
      return from(Promise.resolve());
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    // Check file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    // Check file extension
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !validExtensions.includes(extension)) {
      return { valid: false, error: 'File must be JPG, PNG, or WebP' };
    }

    return { valid: true };
  }
}
