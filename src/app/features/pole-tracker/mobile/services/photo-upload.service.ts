import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadString, getDownloadURL } from '@angular/fire/storage';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { OfflinePhoto } from './offline-pole.service';

export interface PhotoUploadProgress {
  photoId: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoUploadService {
  private storage = inject(Storage);
  
  private uploadProgressSubject = new BehaviorSubject<PhotoUploadProgress[]>([]);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

  async uploadPhotoImmediately(photo: OfflinePhoto, poleId?: string): Promise<string> {
    const uploadProgress: PhotoUploadProgress = {
      photoId: photo.id,
      progress: 0,
      status: 'uploading'
    };
    
    // Add to progress tracking
    const currentProgress = this.uploadProgressSubject.value;
    this.uploadProgressSubject.next([...currentProgress, uploadProgress]);
    
    try {
      // Create unique filename
      const fileName = `poles/${poleId || 'staging'}/${photo.type}_${photo.timestamp.getTime()}_${photo.id}.jpg`;
      const storageRef = ref(this.storage, fileName);
      
      // Update progress to 25%
      this.updateProgress(photo.id, 25);
      
      // Upload base64 string
      await uploadString(storageRef, photo.data, 'data_url');
      
      // Update progress to 75%
      this.updateProgress(photo.id, 75);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Complete upload
      this.updateProgress(photo.id, 100, 'completed', undefined, downloadURL);
      
      return downloadURL;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.updateProgress(photo.id, 0, 'error', errorMessage);
      throw error;
    }
  }

  private updateProgress(
    photoId: string, 
    progress: number, 
    status: PhotoUploadProgress['status'] = 'uploading',
    error?: string,
    url?: string
  ): void {
    const currentProgress = this.uploadProgressSubject.value;
    const updatedProgress = currentProgress.map(p => 
      p.photoId === photoId 
        ? { ...p, progress, status, error, url }
        : p
    );
    this.uploadProgressSubject.next(updatedProgress);
    
    // Remove completed/errored items after 5 seconds
    if (status === 'completed' || status === 'error') {
      setTimeout(() => {
        const filteredProgress = this.uploadProgressSubject.value.filter(
          p => p.photoId !== photoId
        );
        this.uploadProgressSubject.next(filteredProgress);
      }, 5000);
    }
  }

  getUploadStatus(photoId: string): PhotoUploadProgress | null {
    return this.uploadProgressSubject.value.find(p => p.photoId === photoId) || null;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // Queue photos for upload when offline
  private offlineUploadQueue: OfflinePhoto[] = [];
  
  queueForUpload(photo: OfflinePhoto): void {
    this.offlineUploadQueue.push(photo);
  }

  async processOfflineQueue(): Promise<void> {
    if (!this.isOnline() || this.offlineUploadQueue.length === 0) return;
    
    const queuedPhotos = [...this.offlineUploadQueue];
    this.offlineUploadQueue = [];
    
    for (const photo of queuedPhotos) {
      try {
        await this.uploadPhotoImmediately(photo);
      } catch (error) {
        console.error('Failed to upload queued photo:', error);
        // Re-queue failed uploads
        this.queueForUpload(photo);
      }
    }
  }
}