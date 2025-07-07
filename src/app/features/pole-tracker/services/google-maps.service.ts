import { Injectable, inject } from '@angular/core';
import { Observable, from, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

// Declare the global google variable
declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsService {
  private apiLoadedSubject = new BehaviorSubject<boolean>(false);
  apiLoaded$ = this.apiLoadedSubject.asObservable();

  private scriptLoaded = false;
  private watchIds: Map<number, number> = new Map();
  private watchIdCounter = 0;

  constructor() {
    this.loadGoogleMapsApi();
  }

  getCurrentLocation(): Observable<GeolocationPosition> {
    return from(
      new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => {
            let errorMessage = 'Unknown error occurred';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'User denied the request for Geolocation.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage = 'The request to get user location timed out.';
                break;
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
        );
      }),
    );
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    // TODO: Implement actual reverse geocoding using Google Maps API
    // For now, return a placeholder
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  // Helper method to format coordinates
  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  // Check if coordinates are valid
  isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  // Load Google Maps API
  private loadGoogleMapsApi(): void {
    if (this.scriptLoaded || typeof google !== 'undefined') {
      this.scriptLoaded = true;
      this.apiLoadedSubject.next(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.scriptLoaded = true;
      this.apiLoadedSubject.next(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      this.apiLoadedSubject.next(false);
    };
    document.head.appendChild(script);
  }

  // Create a new map instance
  createMap(element: HTMLElement, options: any): any {
    if (typeof google === 'undefined') {
      console.error('Google Maps API not loaded');
      return null;
    }
    return new google.maps.Map(element, options);
  }

  // Create a marker
  createMarker(map: any, options: any): any {
    return new google.maps.Marker({
      map,
      position: options.position,
      title: options.title,
      icon: options.icon,
      data: options.data,
    });
  }

  // Set map center
  setCenter(map: any, center: { lat: number; lng: number }): void {
    if (map) {
      map.setCenter(center);
    }
  }

  // Fit bounds to markers
  fitBounds(map: any, markers: any[]): void {
    if (!map || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((marker) => {
      bounds.extend(marker.getPosition()!);
    });
    map.fitBounds(bounds);
  }

  // Watch location changes
  watchLocation(
    successCallback: (position: GeolocationPosition) => void,
    errorCallback: (error: GeolocationPositionError) => void,
  ): number {
    if (!navigator.geolocation) {
      errorCallback({
        code: 0,
        message: 'Geolocation is not supported',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return -1;
    }

    const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    const internalId = this.watchIdCounter++;
    this.watchIds.set(internalId, watchId);
    return internalId;
  }

  // Stop watching location
  stopWatchingLocation(watchId: number): void {
    const realWatchId = this.watchIds.get(watchId);
    if (realWatchId !== undefined) {
      navigator.geolocation.clearWatch(realWatchId);
      this.watchIds.delete(watchId);
    }
  }

  // Get marker icon based on status
  getMarkerIcon(status: string): any {
    const colors = {
      planned: '#FF0000',
      assigned: '#FF9800',
      in_progress: '#FFC107',
      installed: '#4CAF50',
      verified: '#2196F3',
    };

    const color = colors[status as keyof typeof colors] || '#757575';

    if (typeof google === 'undefined') {
      return undefined;
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  }

  // Create marker clusterer
  createMarkerClusterer(map: any, markers: any[], options?: any): any {
    // Note: This requires the MarkerClusterer library to be loaded
    // For now, return a mock object
    return {
      clearMarkers: () => {},
      addMarkers: (markers: any[]) => {},
      removeMarker: (marker: any) => {},
    };
  }

  // Add location control to map
  addLocationControl(map: any): void {
    if (!map || typeof google === 'undefined') return;

    const locationButton = document.createElement('button');
    locationButton.textContent = 'My Location';
    locationButton.classList.add('custom-map-control-button');
    locationButton.type = 'button';
    locationButton.addEventListener('click', () => {
      this.getCurrentLocation().subscribe({
        next: (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.setCenter(pos);
          map.setZoom(17);
        },
        error: (error) => {
          console.error('Error getting location:', error);
        },
      });
    });

    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationButton);
  }
}
