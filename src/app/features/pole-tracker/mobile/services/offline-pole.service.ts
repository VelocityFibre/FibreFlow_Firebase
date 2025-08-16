import { Injectable, inject } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { PoleTracker } from '../../models/pole-tracker.model';

export interface OfflinePoleData extends Partial<PoleTracker> {
  id: string;
  syncStatus: 'draft' | 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  capturedOffline: boolean;
  capturedAt: Date;
  photos: OfflinePhoto[];
  projectId?: string;
  poleNumber?: string;
  location?: string;
  gpsLocation?: { latitude: number; longitude: number };
  gpsAccuracy?: number;
  status?: string;
  capturedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
}

export interface OfflinePhoto {
  id: string;
  data: string; // Base64 encoded
  type: 'before' | 'front' | 'side' | 'depth' | 'concrete' | 'compaction';
  timestamp: Date;
  size: number;
  compressed: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadUrl?: string; // Firebase Storage URL after upload
  uploadError?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'pole' | 'photo';
  data: any;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflinePoleService {
  private db?: IDBDatabase;
  private readonly DB_NAME = 'fibreflow-offline';
  private readonly DB_VERSION = 1;
  
  private offlinePolesSubject = new BehaviorSubject<OfflinePoleData[]>([]);
  public offlinePoles$ = this.offlinePolesSubject.asObservable();
  
  private syncQueueSubject = new BehaviorSubject<SyncQueueItem[]>([]);
  public syncQueue$ = this.syncQueueSubject.asObservable();
  
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public online$ = this.onlineSubject.asObservable();

  constructor() {
    this.initializeDB();
    this.setupOnlineListeners();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadOfflinePoles();
        this.loadSyncQueue();
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('poles')) {
          const poleStore = db.createObjectStore('poles', { keyPath: 'id' });
          poleStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          poleStore.createIndex('projectId', 'projectId', { unique: false });
          poleStore.createIndex('capturedAt', 'capturedAt', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('poleId', 'poleId', { unique: false });
          photoStore.createIndex('type', 'type', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('attempts', 'attempts', { unique: false });
        }
      };
    });
  }

  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.onlineSubject.next(true);
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.onlineSubject.next(false);
    });
  }

  async storeDraftPole(poleData: Partial<PoleTracker>, photos: OfflinePhoto[] = []): Promise<string> {
    if (!this.db) {
      await this.initializeDB();
    }
    
    const id = this.generateId();
    const draftPole: OfflinePoleData = {
      ...poleData,
      id,
      syncStatus: 'draft',
      capturedOffline: true,
      capturedAt: new Date(),
      photos,
      createdAt: new Date(),
      updatedAt: new Date()
    } as OfflinePoleData;
    
    const transaction = this.db!.transaction(['poles', 'photos'], 'readwrite');
    const poleStore = transaction.objectStore('poles');
    const photoStore = transaction.objectStore('photos');
    
    // Store pole
    await this.promisifyRequest(poleStore.add(draftPole));
    
    // Store photos
    for (const photo of photos) {
      const photoWithPoleId = { ...photo, poleId: id };
      await this.promisifyRequest(photoStore.add(photoWithPoleId));
    }
    
    await this.loadOfflinePoles();
    
    return id;
  }

  async storePoleOffline(poleData: Partial<PoleTracker>, photos: OfflinePhoto[]): Promise<string> {
    if (!this.db) {
      await this.initializeDB();
    }
    
    const id = this.generateId();
    const offlinePole: OfflinePoleData = {
      ...poleData,
      id,
      syncStatus: 'pending',
      capturedOffline: true,
      capturedAt: new Date(),
      photos,
      createdAt: new Date(),
      updatedAt: new Date()
    } as OfflinePoleData;
    
    const transaction = this.db!.transaction(['poles', 'photos', 'syncQueue'], 'readwrite');
    const poleStore = transaction.objectStore('poles');
    const photoStore = transaction.objectStore('photos');
    const syncStore = transaction.objectStore('syncQueue');
    
    // Store pole
    await this.promisifyRequest(poleStore.add(offlinePole));
    
    // Store photos
    for (const photo of photos) {
      const photoWithPoleId = { ...photo, poleId: id };
      await this.promisifyRequest(photoStore.add(photoWithPoleId));
    }
    
    // Add to sync queue
    const syncItem: SyncQueueItem = {
      id: this.generateId(),
      type: 'pole',
      data: { poleId: id },
      attempts: 0
    };
    await this.promisifyRequest(syncStore.add(syncItem));
    
    await this.loadOfflinePoles();
    await this.loadSyncQueue();
    
    // Try to sync if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }
    
    return id;
  }

  async getOfflinePole(id: string): Promise<OfflinePoleData | null> {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['poles'], 'readonly');
    const store = transaction.objectStore('poles');
    const pole = await this.promisifyRequest<OfflinePoleData>(store.get(id));
    
    if (pole) {
      // Load photos
      const photoTransaction = this.db.transaction(['photos'], 'readonly');
      const photoStore = photoTransaction.objectStore('photos');
      const photoIndex = photoStore.index('poleId');
      const photos = await this.promisifyRequest<OfflinePhoto[]>(photoIndex.getAll(id));
      pole.photos = photos;
    }
    
    return pole;
  }

  async updatePoleOffline(id: string, updates: Partial<OfflinePoleData>, newPhotos?: OfflinePhoto[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['poles', 'photos'], 'readwrite');
    const poleStore = transaction.objectStore('poles');
    const photoStore = transaction.objectStore('photos');
    const pole = await this.promisifyRequest<OfflinePoleData>(poleStore.get(id));

    if (pole) {
      // Update pole data
      Object.assign(pole, updates);
      pole.updatedAt = new Date();
      await this.promisifyRequest(poleStore.put(pole));

      // Update photos if provided
      if (newPhotos) {
        // Remove old photos for this pole
        const photoIndex = photoStore.index('poleId');
        const oldPhotos = await this.promisifyRequest<OfflinePhoto[]>(photoIndex.getAll(id));
        for (const oldPhoto of oldPhotos) {
          await this.promisifyRequest(photoStore.delete(oldPhoto.id));
        }

        // Add new photos
        for (const photo of newPhotos) {
          const photoWithPoleId = { ...photo, poleId: id };
          await this.promisifyRequest(photoStore.add(photoWithPoleId));
        }

        // Update the pole's photos array
        pole.photos = newPhotos;
        await this.promisifyRequest(poleStore.put(pole));
      }

      await this.loadOfflinePoles();
    }
  }

  async promoteDraftToPending(id: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['poles', 'syncQueue'], 'readwrite');
    const poleStore = transaction.objectStore('poles');
    const syncStore = transaction.objectStore('syncQueue');
    
    const pole = await this.promisifyRequest<OfflinePoleData>(poleStore.get(id));
    
    if (pole && pole.syncStatus === 'draft') {
      // Update status to pending
      pole.syncStatus = 'pending';
      pole.updatedAt = new Date();
      await this.promisifyRequest(poleStore.put(pole));

      // Add to sync queue
      const syncItem: SyncQueueItem = {
        id: this.generateId(),
        type: 'pole',
        data: { poleId: id },
        attempts: 0
      };
      await this.promisifyRequest(syncStore.add(syncItem));
      
      await this.loadOfflinePoles();
      await this.loadSyncQueue();
      
      // Try to sync if online
      if (navigator.onLine) {
        this.processSyncQueue();
      }
    }
  }

  async updatePoleStatus(id: string, status: OfflinePoleData['syncStatus'], error?: string): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['poles'], 'readwrite');
    const store = transaction.objectStore('poles');
    const pole = await this.promisifyRequest<OfflinePoleData>(store.get(id));
    
    if (pole) {
      pole.syncStatus = status;
      if (error) pole.syncError = error;
      pole.updatedAt = new Date();
      await this.promisifyRequest(store.put(pole));
      await this.loadOfflinePoles();
    }
  }

  async deleteSyncedPole(id: string): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['poles', 'photos', 'syncQueue'], 'readwrite');
    const poleStore = transaction.objectStore('poles');
    const photoStore = transaction.objectStore('photos');
    const photoIndex = photoStore.index('poleId');
    
    // Delete pole
    await this.promisifyRequest(poleStore.delete(id));
    
    // Delete associated photos
    const photos = await this.promisifyRequest<OfflinePhoto[]>(photoIndex.getAll(id));
    for (const photo of photos) {
      await this.promisifyRequest(photoStore.delete(photo.id));
    }
    
    await this.loadOfflinePoles();
  }

  private async loadOfflinePoles(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['poles'], 'readonly');
    const store = transaction.objectStore('poles');
    const poles = await this.promisifyRequest<OfflinePoleData[]>(store.getAll());
    
    // Load photos for each pole
    for (const pole of poles) {
      const photoTransaction = this.db.transaction(['photos'], 'readonly');
      const photoStore = photoTransaction.objectStore('photos');
      const photoIndex = photoStore.index('poleId');
      pole.photos = await this.promisifyRequest<OfflinePhoto[]>(photoIndex.getAll(pole.id));
    }
    
    this.offlinePolesSubject.next(poles);
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const items = await this.promisifyRequest<SyncQueueItem[]>(store.getAll());
    this.syncQueueSubject.next(items);
  }

  async processSyncQueue(): Promise<void> {
    if (!navigator.onLine || !this.db) return;
    
    const queue = this.syncQueueSubject.value;
    for (const item of queue) {
      if (item.attempts >= 3) continue; // Skip after 3 failed attempts
      
      try {
        await this.syncItem(item);
        
        // Remove from queue on success
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        await this.promisifyRequest(store.delete(item.id));
      } catch (error) {
        // Update attempts
        item.attempts++;
        item.lastAttempt = new Date();
        item.error = error instanceof Error ? error.message : 'Unknown error';
        
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        await this.promisifyRequest(store.put(item));
      }
    }
    
    await this.loadSyncQueue();
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    // This will be implemented to sync with Firebase
    // For now, just mark as synced after a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (item.type === 'pole' && item.data.poleId) {
      await this.updatePoleStatus(item.data.poleId, 'synced');
    }
  }

  private promisifyRequest<T = any>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async clearAllOfflineData(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['poles', 'photos', 'syncQueue'], 'readwrite');
    await this.promisifyRequest(transaction.objectStore('poles').clear());
    await this.promisifyRequest(transaction.objectStore('photos').clear());
    await this.promisifyRequest(transaction.objectStore('syncQueue').clear());
    
    this.offlinePolesSubject.next([]);
    this.syncQueueSubject.next([]);
  }

  getTotalOfflineCount(): number {
    return this.offlinePolesSubject.value.length;
  }

  getPendingSyncCount(): number {
    return this.syncQueueSubject.value.length;
  }

  getFailedSyncCount(): number {
    return this.offlinePolesSubject.value.filter(pole => pole.syncStatus === 'error').length;
  }
}