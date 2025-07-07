import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { collection, addDoc, deleteDoc, getDocs, doc, Firestore } from '@angular/fire/firestore';

export interface QueueItem {
  id?: string;
  type: string;
  action: string;
  entityId: string;
  data: any;
  priority: number;
  timestamp?: Date;
  retryCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OfflineQueueService {
  private firestore = inject(Firestore);
  private readonly QUEUE_COLLECTION = 'offline_queue';

  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  constructor() {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  private updateOnlineStatus(status: boolean) {
    this.isOnlineSubject.next(status);
    if (status) {
      this.processQueue();
    }
  }

  addToQueue(item: QueueItem): Observable<void> {
    return from(this.addItemToQueue(item));
  }

  private async addItemToQueue(item: QueueItem): Promise<void> {
    const queueItem = {
      ...item,
      timestamp: new Date(),
      retryCount: 0,
    };

    try {
      const queueRef = collection(this.firestore, this.QUEUE_COLLECTION);
      await addDoc(queueRef, queueItem);
    } catch (error) {
      console.error('Error adding to offline queue:', error);
      // Store in localStorage as fallback
      const localQueue = this.getLocalQueue();
      localQueue.push(queueItem);
      localStorage.setItem('offlineQueue', JSON.stringify(localQueue));
    }
  }

  private getLocalQueue(): QueueItem[] {
    const stored = localStorage.getItem('offlineQueue');
    return stored ? JSON.parse(stored) : [];
  }

  async processQueue(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const queueRef = collection(this.firestore, this.QUEUE_COLLECTION);
      const snapshot = await getDocs(queueRef);

      const items = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as QueueItem,
      );

      // Sort by priority and timestamp
      items.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0);
      });

      // Process each item
      for (const item of items) {
        await this.processQueueItem(item);
      }

      // Process local storage queue
      const localQueue = this.getLocalQueue();
      for (const item of localQueue) {
        await this.processQueueItem(item);
      }
      localStorage.removeItem('offlineQueue');
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      // TODO: Implement actual processing based on item type
      console.log('Processing queue item:', item);

      // Remove from queue after successful processing
      if (item.id) {
        const docRef = doc(this.firestore, this.QUEUE_COLLECTION, item.id);
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error('Error processing queue item:', error);
      // Increment retry count or handle failure
    }
  }
}
