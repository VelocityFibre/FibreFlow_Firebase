import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, throwError } from 'rxjs';
import { map, tap, catchError, timeout, retry } from 'rxjs/operators';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export interface GPSOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  requiredAccuracy?: number; // in meters
  maxAttempts?: number;
}

export interface GPSStatus {
  isTracking: boolean;
  lastPosition?: GPSPosition;
  lastError?: string;
  attempts: number;
  bestAccuracy: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedGPSService {
  private readonly DEFAULT_OPTIONS: GPSOptions = {
    enableHighAccuracy: true,
    timeout: 10000, // 10 seconds
    maximumAge: 0, // No cached position
    requiredAccuracy: 5, // 5 meters
    maxAttempts: 5
  };

  private positionSubject = new BehaviorSubject<GPSPosition | null>(null);
  public position$ = this.positionSubject.asObservable();

  private statusSubject = new BehaviorSubject<GPSStatus>({
    isTracking: false,
    attempts: 0,
    bestAccuracy: Infinity
  });
  public status$ = this.statusSubject.asObservable();

  get currentStatus(): GPSStatus {
    return this.statusSubject.value;
  }

  private watchId?: number;

  constructor() {
    this.checkGPSAvailability();
  }

  private checkGPSAvailability(): boolean {
    if (!('geolocation' in navigator)) {
      this.updateStatus({ lastError: 'Geolocation is not supported by this browser' });
      return false;
    }
    return true;
  }

  async getCurrentPosition(options?: GPSOptions): Promise<GPSPosition> {
    if (!this.checkGPSAvailability()) {
      throw new Error('GPS not available');
    }

    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let attempts = 0;
    let bestPosition: GPSPosition | null = null;

    this.updateStatus({ isTracking: true, attempts: 0, bestAccuracy: Infinity });

    while (attempts < opts.maxAttempts!) {
      attempts++;
      this.updateStatus({ attempts });

      try {
        const position = await this.getPositionOnce(opts);
        
        if (!bestPosition || position.accuracy < bestPosition.accuracy) {
          bestPosition = position;
          this.updateStatus({ bestAccuracy: position.accuracy });
        }

        // If we meet the required accuracy, return immediately
        if (position.accuracy <= opts.requiredAccuracy!) {
          this.positionSubject.next(position);
          this.updateStatus({ 
            isTracking: false, 
            lastPosition: position,
            lastError: undefined 
          });
          return position;
        }

        // Wait a bit before next attempt to allow GPS to stabilize
        if (attempts < opts.maxAttempts!) {
          await this.delay(1000);
        }
      } catch (error) {
        const errorMessage = this.getErrorMessage(error);
        this.updateStatus({ lastError: errorMessage });
        
        // If this is the last attempt, throw the error
        if (attempts >= opts.maxAttempts!) {
          this.updateStatus({ isTracking: false });
          
          // If we have a best position but it doesn't meet accuracy, return it with warning
          if (bestPosition) {
            console.warn(`GPS accuracy ${bestPosition.accuracy}m exceeds required ${opts.requiredAccuracy}m`);
            this.positionSubject.next(bestPosition);
            return bestPosition;
          }
          
          throw new Error(`Failed to get GPS position: ${errorMessage}`);
        }
      }
    }

    this.updateStatus({ isTracking: false });
    
    if (bestPosition) {
      console.warn(`GPS accuracy ${bestPosition.accuracy}m exceeds required ${opts.requiredAccuracy}m after ${attempts} attempts`);
      this.positionSubject.next(bestPosition);
      return bestPosition;
    }

    throw new Error('Failed to obtain GPS position');
  }

  startWatching(options?: GPSOptions): Observable<GPSPosition> {
    if (!this.checkGPSAvailability()) {
      return throwError(() => new Error('GPS not available'));
    }

    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    // Clear any existing watch
    this.stopWatching();

    this.updateStatus({ isTracking: true });

    return new Observable<GPSPosition>(observer => {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const gpsPosition = this.convertToGPSPosition(position);
          
          // Only emit if accuracy meets requirement
          if (gpsPosition.accuracy <= opts.requiredAccuracy!) {
            this.positionSubject.next(gpsPosition);
            this.updateStatus({ 
              lastPosition: gpsPosition,
              bestAccuracy: Math.min(this.statusSubject.value.bestAccuracy, gpsPosition.accuracy),
              lastError: undefined
            });
            observer.next(gpsPosition);
          } else {
            console.warn(`GPS accuracy ${gpsPosition.accuracy}m exceeds required ${opts.requiredAccuracy}m`);
            this.updateStatus({ 
              bestAccuracy: Math.min(this.statusSubject.value.bestAccuracy, gpsPosition.accuracy)
            });
          }
        },
        (error) => {
          const errorMessage = this.getErrorMessage(error);
          this.updateStatus({ lastError: errorMessage });
          observer.error(new Error(errorMessage));
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge
        }
      );

      // Cleanup on unsubscribe
      return () => this.stopWatching();
    });
  }

  stopWatching(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
      this.updateStatus({ isTracking: false });
    }
  }

  private getPositionOnce(options: GPSOptions): Promise<GPSPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(this.convertToGPSPosition(position)),
        reject,
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );
    });
  }

  private convertToGPSPosition(position: GeolocationPosition): GPSPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
  }

  private getErrorMessage(error: any): string {
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          return 'GPS permission denied. Please enable location services.';
        case error.POSITION_UNAVAILABLE:
          return 'GPS position unavailable. Please check your device settings.';
        case error.TIMEOUT:
          return 'GPS request timed out. Please try again.';
        default:
          return 'Unknown GPS error occurred.';
      }
    }
    return error?.message || 'Unknown error';
  }

  private updateStatus(updates: Partial<GPSStatus>): void {
    this.statusSubject.next({
      ...this.statusSubject.value,
      ...updates
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatCoordinates(position: GPSPosition): string {
    return `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
  }

  formatAccuracy(accuracy: number): string {
    return `±${accuracy.toFixed(1)}m`;
  }

  isAccuracyAcceptable(accuracy: number, required: number = 5): boolean {
    return accuracy <= required;
  }

  calculateDistance(pos1: GPSPosition, pos2: GPSPosition): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.latitude * Math.PI / 180;
    const φ2 = pos2.latitude * Math.PI / 180;
    const Δφ = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const Δλ = (pos2.longitude - pos1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}