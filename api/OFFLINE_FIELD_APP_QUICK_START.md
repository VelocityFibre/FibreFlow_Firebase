# Offline Field App API - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Get Your Credentials
```javascript
const API_KEY = 'field-app-dev-key-2025';  // Dev key for testing
const DEVICE_ID = 'android_' + Math.random().toString(36).substring(7);
const BASE_URL = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI';
```

### 2. Test Connection
```javascript
// Quick health check
fetch(`${BASE_URL}/health`, {
  headers: {
    'X-API-Key': API_KEY,
    'X-Device-ID': DEVICE_ID
  }
})
.then(r => r.json())
.then(console.log);
// Expected: { status: "healthy", service: "offline-field-app-api" }
```

### 3. Capture a Pole (Simplest Example)
```javascript
async function capturePole() {
  const poleData = {
    pole: {
      poleNumber: "LAW.P.B167",
      projectId: "project123",
      gps: {
        latitude: -26.123456,
        longitude: 28.123456,
        accuracy: 5.2,
        timestamp: new Date().toISOString()
      },
      status: "installed",
      notes: "Test capture"
    },
    photos: {
      before: "https://your-photo-url.com/before.jpg",
      front: "https://your-photo-url.com/front.jpg"
      // Add more photo URLs as needed
    },
    offline_created_at: new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/api/v1/poles/capture`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'X-Device-ID': DEVICE_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(poleData)
  });

  return response.json();
}

// Use it
capturePole().then(console.log);
// Expected: { success: true, data: { submissionId: "field_android_xxx_123", status: "captured" } }
```

## 📱 React Native / Flutter Example

### Complete Working Example
```javascript
class FieldAppClient {
  constructor() {
    this.apiKey = 'field-app-dev-key-2025';
    this.deviceId = DeviceInfo.getUniqueId(); // or use expo-device
    this.baseUrl = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI';
    this.offlineQueue = [];
  }

  // Upload photo and get URL
  async uploadPhoto(poleNumber, photoType, base64Data) {
    const response = await fetch(`${this.baseUrl}/api/v1/photos/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'X-Device-ID': this.deviceId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        poleNumber,
        photoType,
        photoData: base64Data,
        mimeType: 'image/jpeg'
      })
    });
    
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  // Capture pole with offline support
  async capturePole(poleData, photos) {
    try {
      // Upload photos first
      const photoUrls = {};
      for (const [type, base64] of Object.entries(photos)) {
        const upload = await this.uploadPhoto(poleData.poleNumber, type, base64);
        photoUrls[type] = upload.data.url;
      }

      // Capture pole
      const response = await fetch(`${this.baseUrl}/api/v1/poles/capture`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'X-Device-ID': this.deviceId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pole: poleData,
          photos: photoUrls,
          offline_created_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Capture failed');
      return response.json();
      
    } catch (error) {
      // Save to offline queue
      this.offlineQueue.push({
        timestamp: new Date().toISOString(),
        poleData,
        photos
      });
      throw error;
    }
  }

  // Sync offline data when back online
  async syncOfflineData() {
    if (this.offlineQueue.length === 0) return;

    const batches = [];
    for (let i = 0; i < this.offlineQueue.length; i += 50) {
      batches.push(this.offlineQueue.slice(i, i + 50));
    }

    for (const batch of batches) {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/poles/batch`, {
          method: 'POST',
          headers: {
            'X-API-Key': this.apiKey,
            'X-Device-ID': this.deviceId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            poles: batch.map(item => ({
              pole: item.poleData,
              photos: item.photos,
              metadata: { offlineCreatedAt: item.timestamp }
            })),
            syncBatchId: `batch_${this.deviceId}_${Date.now()}`
          })
        });

        if (response.ok) {
          // Remove synced items
          this.offlineQueue = this.offlineQueue.filter(item => !batch.includes(item));
        }
      } catch (error) {
        console.error('Batch sync failed:', error);
      }
    }
  }
}

// Usage in your app
const fieldApp = new FieldAppClient();

// Capture pole with photos
const poleData = {
  poleNumber: "LAW.P.B167",
  projectId: "project123",
  gps: await getCurrentLocation(),
  status: "installed"
};

const photos = {
  before: await capturePhoto('before'),  // returns base64
  front: await capturePhoto('front'),
  side: await capturePhoto('side')
};

try {
  const result = await fieldApp.capturePole(poleData, photos);
  console.log('Success:', result);
} catch (error) {
  console.log('Saved offline, will sync later');
}

// Later, when online
await fieldApp.syncOfflineData();
```

## 🌐 Offline Strategy

### Simple Offline Queue
```javascript
// Save to AsyncStorage/SQLite when offline
const saveOffline = async (data) => {
  const queue = await AsyncStorage.getItem('offlineQueue') || '[]';
  const items = JSON.parse(queue);
  items.push({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    data
  });
  await AsyncStorage.setItem('offlineQueue', JSON.stringify(items));
};

// Check connection and sync
const syncWhenOnline = async () => {
  const isOnline = await NetInfo.fetch().then(state => state.isConnected);
  if (!isOnline) return;
  
  const queue = JSON.parse(await AsyncStorage.getItem('offlineQueue') || '[]');
  if (queue.length === 0) return;
  
  // Process queue...
};
```

## 📸 Photo Handling

### Optimize Before Upload
```javascript
const optimizePhoto = async (uri) => {
  // Using react-native-image-resizer
  const resized = await ImageResizer.createResizedImage(
    uri,
    1920,  // maxWidth
    1080,  // maxHeight
    'JPEG',
    80,    // quality
    0      // rotation
  );
  
  // Convert to base64
  const base64 = await RNFS.readFile(resized.uri, 'base64');
  return base64;
};
```

## 📍 GPS Best Practices

### Get Accurate Location
```javascript
const getAccurateLocation = async () => {
  return new Promise((resolve) => {
    let bestLocation = null;
    let attempts = 0;
    
    const watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        
        // Accept if accuracy < 10m or after 5 attempts
        if (location.accuracy < 10 || attempts >= 5) {
          Geolocation.clearWatch(watchId);
          resolve(location);
        } else if (!bestLocation || location.accuracy < bestLocation.accuracy) {
          bestLocation = location;
        }
        
        attempts++;
      },
      (error) => {
        Geolocation.clearWatch(watchId);
        resolve(bestLocation || null);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 0 
      }
    );
  });
};
```

## 🧪 Testing Your Integration

### 1. Test Health Check
```bash
curl -H "X-API-Key: field-app-dev-key-2025" \
     -H "X-Device-ID: test-device-001" \
     https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/health
```

### 2. Test Pole Capture
```javascript
// Simple test script
const testCapture = async () => {
  const testPole = {
    pole: {
      poleNumber: `TEST.P.${Date.now()}`,
      projectId: "test-project",
      gps: {
        latitude: -26.123,
        longitude: 28.456,
        accuracy: 5,
        timestamp: new Date().toISOString()
      },
      status: "installed"
    },
    photos: {
      before: "https://via.placeholder.com/150",
      front: "https://via.placeholder.com/150"
    },
    offline_created_at: new Date().toISOString()
  };

  const response = await fetch(`${BASE_URL}/api/v1/poles/capture`, {
    method: 'POST',
    headers: {
      'X-API-Key': 'field-app-dev-key-2025',
      'X-Device-ID': 'test-device-001',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPole)
  });

  console.log(await response.json());
};

testCapture();
```

## 🔑 Production Checklist

- [ ] Replace dev API key with production key
- [ ] Implement proper device ID generation
- [ ] Add retry logic for failed requests
- [ ] Implement offline queue with persistence
- [ ] Add photo compression/optimization
- [ ] Handle GPS timeout scenarios
- [ ] Add error tracking/logging
- [ ] Test on various network conditions
- [ ] Implement sync status UI feedback
- [ ] Add user authentication if required

## 🆘 Common Issues

### "UNAUTHORIZED" Error
- Check API key is correct
- Ensure both headers are present: `X-API-Key` and `X-Device-ID`

### "UPLOAD_ERROR" for Photos
- Check photo size (max 10MB after base64 encoding)
- Verify base64 string is valid
- Ensure mime type is correct

### GPS Accuracy Issues
- Request location permissions
- Enable high accuracy mode
- Wait for better signal before capture
- Show accuracy to user

### Sync Failures
- Check network connectivity
- Verify batch size (max 100 poles)
- Implement exponential backoff for retries

## 📞 Support

Need help? Include these in your support request:
- Your device ID
- Submission IDs for failed captures
- Error messages/codes
- API endpoint being called

---

**Happy Coding! 🚀**

This API is designed to work reliably in the field with poor connectivity. The offline-first approach ensures your data is never lost.