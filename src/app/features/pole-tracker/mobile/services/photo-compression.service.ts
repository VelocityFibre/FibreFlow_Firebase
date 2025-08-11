import { Injectable } from '@angular/core';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

@Injectable({
  providedIn: 'root'
})
export class PhotoCompressionService {
  private readonly DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'jpeg'
  };

  async compressImage(file: File | Blob, options?: CompressionOptions): Promise<Blob> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Create image element
    const img = await this.loadImage(file);
    
    // Calculate new dimensions
    const { width, height } = this.calculateDimensions(
      img.width,
      img.height,
      opts.maxWidth!,
      opts.maxHeight!
    );
    
    // Create canvas and compress
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        `image/${opts.format}`,
        opts.quality
      );
    });
  }

  async compressImageToBase64(file: File | Blob, options?: CompressionOptions): Promise<string> {
    const compressedBlob = await this.compressImage(file, options);
    return this.blobToBase64(compressedBlob);
  }

  async compressMultipleImages(
    files: (File | Blob)[],
    options?: CompressionOptions
  ): Promise<Blob[]> {
    const promises = files.map(file => this.compressImage(file, options));
    return Promise.all(promises);
  }

  private loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // If image is smaller than max dimensions, return original
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    
    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    
    let width = maxWidth;
    let height = maxWidth / aspectRatio;
    
    // If height exceeds max, scale by height instead
    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async getImageSize(file: File | Blob): Promise<{ width: number; height: number; size: number }> {
    const img = await this.loadImage(file);
    return {
      width: img.width,
      height: img.height,
      size: file.size
    };
  }

  async estimateCompressedSize(
    file: File | Blob,
    options?: CompressionOptions
  ): Promise<number> {
    const compressed = await this.compressImage(file, options);
    return compressed.size;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}