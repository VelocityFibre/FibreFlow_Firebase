import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';

export interface PhotoWithMetadata {
  base64: string;
  webPath: string;
  format: string;
  saved: boolean;
  exif?: any;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}

export interface CameraOptions {
  quality: number; // 0-100
  allowEditing: boolean;
  resultType: CameraResultType;
  source: CameraSource;
  saveToGallery: boolean;
  correctOrientation: boolean;
  width?: number;
  height?: number;
}

export class NativeCameraService {
  private defaultOptions: CameraOptions = {
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
    saveToGallery: false,
    correctOrientation: true,
    width: 1920,
    height: 1080
  };

  async takePolePhoto(photoType: string, customOptions?: Partial<CameraOptions>): Promise<PhotoWithMetadata> {
    try {
      // Get current GPS location
      const gpsLocation = await this.getCurrentLocation();

      // Merge options
      const options: CameraOptions = {
        ...this.defaultOptions,
        ...customOptions
      };

      // Take photo
      const photo: Photo = await Camera.getPhoto(options);

      if (!photo.base64String) {
        throw new Error('Failed to capture photo as base64');
      }

      return {
        base64: photo.base64String,
        webPath: photo.webPath || '',
        format: photo.format,
        saved: false,
        gpsLocation
      };
    } catch (error) {
      console.error(`Failed to take ${photoType} photo:`, error);
      throw error;
    }
  }

  async takeRequiredPhotos(): Promise<{[key: string]: PhotoWithMetadata}> {
    const requiredPhotos = [
      'before',
      'front', 
      'side',
      'depth',
      'concrete',
      'compaction'
    ];

    const photos: {[key: string]: PhotoWithMetadata} = {};

    for (const photoType of requiredPhotos) {
      try {
        const photo = await this.takePhotoWithPrompt(photoType);
        photos[photoType] = photo;
      } catch (error) {
        console.error(`Failed to take ${photoType} photo:`, error);
        throw new Error(`Required photo '${photoType}' not captured`);
      }
    }

    return photos;
  }

  private async takePhotoWithPrompt(photoType: string): Promise<PhotoWithMetadata> {
    const photoInstructions: {[key: string]: string} = {
      before: 'Take a photo of the site before installation',
      front: 'Take a front view photo of the installed pole',
      side: 'Take a side angle photo of the pole',
      depth: 'Take a photo showing the installation depth',
      concrete: 'Take a photo of the concrete base/foundation',
      compaction: 'Take a photo showing ground compaction around the pole'
    };

    // In a real app, show instruction dialog here
    console.log(`Instruction: ${photoInstructions[photoType]}`);

    return await this.takePolePhoto(photoType, {
      // Higher quality for required photos
      quality: 95,
      width: 2048,
      height: 1536
    });
  }

  private async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }> {
    try {
      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
    } catch (error) {
      console.error('Failed to get GPS location:', error);
      // Return default location or throw based on app settings
      throw new Error('GPS location required for pole capture');
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission = await Camera.requestPermissions();
      
      // Request location permissions
      const locationPermission = await Geolocation.requestPermissions();

      return (
        cameraPermission.camera === 'granted' && 
        locationPermission.location === 'granted'
      );
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<{camera: boolean, location: boolean}> {
    try {
      const cameraPermissions = await Camera.checkPermissions();
      const locationPermissions = await Geolocation.checkPermissions();

      return {
        camera: cameraPermissions.camera === 'granted',
        location: locationPermissions.location === 'granted'
      };
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return { camera: false, location: false };
    }
  }

  getPhotoQuality(): number {
    const saved = localStorage.getItem('photoQuality');
    return saved ? parseInt(saved) : 90;
  }

  setPhotoQuality(quality: number): void {
    localStorage.setItem('photoQuality', quality.toString());
    this.defaultOptions.quality = quality;
  }

  // Utility method to compress photos if needed
  async compressPhoto(base64: string, quality: number = 80): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        let { width, height } = img;
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality / 100);
        
        // Remove data:image/jpeg;base64, prefix
        resolve(compressedBase64.split(',')[1]);
      };

      img.src = `data:image/jpeg;base64,${base64}`;
    });
  }
}

// Singleton instance
export const cameraService = new NativeCameraService();