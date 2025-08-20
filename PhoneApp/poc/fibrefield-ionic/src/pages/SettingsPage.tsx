import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonListHeader,
  IonNote,
  IonButton,
  IonAlert
} from '@ionic/react';
import { 
  camera, 
  cloud, 
  moon, 
  notifications, 
  location,
  trash,
  information
} from 'ionicons/icons';
import { Filesystem, Directory } from '@capacitor/filesystem';

const SettingsPage: React.FC = () => {
  const [photoQuality, setPhotoQuality] = useState('90');
  const [autoSync, setAutoSync] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [gpsRequired, setGpsRequired] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [storageUsed, setStorageUsed] = useState('0 MB');
  const [showClearAlert, setShowClearAlert] = useState(false);

  useEffect(() => {
    loadSettings();
    calculateStorageUsed();
  }, []);

  const loadSettings = () => {
    const settings = {
      photoQuality: localStorage.getItem('photoQuality') || '90',
      autoSync: localStorage.getItem('autoSync') !== 'false',
      darkMode: localStorage.getItem('darkMode') === 'true',
      gpsRequired: localStorage.getItem('gpsRequired') !== 'false',
      notifications: localStorage.getItem('notifications') !== 'false'
    };

    setPhotoQuality(settings.photoQuality);
    setAutoSync(settings.autoSync);
    setDarkMode(settings.darkMode);
    setGpsRequired(settings.gpsRequired);
    setNotifications(settings.notifications);

    // Apply dark mode
    document.body.classList.toggle('dark', settings.darkMode);
  };

  const calculateStorageUsed = async () => {
    try {
      // In a real app, calculate actual storage used
      const result = await Filesystem.stat({
        path: 'poles',
        directory: Directory.Data
      });
      
      // Convert bytes to MB
      const mb = (result.size / 1024 / 1024).toFixed(2);
      setStorageUsed(`${mb} MB`);
    } catch (error) {
      // Directory doesn't exist yet
      setStorageUsed('0 MB');
    }
  };

  const handlePhotoQualityChange = (value: string) => {
    setPhotoQuality(value);
    localStorage.setItem('photoQuality', value);
  };

  const handleAutoSyncToggle = (checked: boolean) => {
    setAutoSync(checked);
    localStorage.setItem('autoSync', checked.toString());
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('darkMode', checked.toString());
    document.body.classList.toggle('dark', checked);
  };

  const handleGpsToggle = (checked: boolean) => {
    setGpsRequired(checked);
    localStorage.setItem('gpsRequired', checked.toString());
  };

  const handleNotificationsToggle = (checked: boolean) => {
    setNotifications(checked);
    localStorage.setItem('notifications', checked.toString());
  };

  const handleClearStorage = async () => {
    try {
      // Clear offline data
      await Filesystem.rmdir({
        path: 'poles',
        directory: Directory.Data,
        recursive: true
      });

      // Clear IndexedDB
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      });

      // Clear localStorage (except settings)
      const settings = ['photoQuality', 'autoSync', 'darkMode', 'gpsRequired', 'notifications'];
      const savedSettings: any = {};
      settings.forEach(key => {
        savedSettings[key] = localStorage.getItem(key);
      });
      
      localStorage.clear();
      
      // Restore settings
      Object.keys(savedSettings).forEach(key => {
        if (savedSettings[key] !== null) {
          localStorage.setItem(key, savedSettings[key]);
        }
      });

      setStorageUsed('0 MB');
      setShowClearAlert(false);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList>
          <IonListHeader>
            <IonLabel>Camera Settings</IonLabel>
          </IonListHeader>
          
          <IonItem>
            <IonIcon icon={camera} slot="start" />
            <IonLabel>Photo Quality</IonLabel>
            <IonSelect 
              value={photoQuality} 
              onIonChange={e => handlePhotoQualityChange(e.detail.value)}
            >
              <IonSelectOption value="100">Maximum (100%)</IonSelectOption>
              <IonSelectOption value="90">High (90%)</IonSelectOption>
              <IonSelectOption value="80">Medium (80%)</IonSelectOption>
              <IonSelectOption value="70">Low (70%)</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem>
            <IonIcon icon={location} slot="start" />
            <IonLabel>
              <h3>Require GPS Location</h3>
              <p>GPS must be available to capture poles</p>
            </IonLabel>
            <IonToggle 
              checked={gpsRequired} 
              onIonChange={e => handleGpsToggle(e.detail.checked)}
            />
          </IonItem>

          <IonListHeader>
            <IonLabel>Sync Settings</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonIcon icon={cloud} slot="start" />
            <IonLabel>
              <h3>Auto Sync</h3>
              <p>Automatically sync when online</p>
            </IonLabel>
            <IonToggle 
              checked={autoSync} 
              onIonChange={e => handleAutoSyncToggle(e.detail.checked)}
            />
          </IonItem>

          <IonListHeader>
            <IonLabel>App Settings</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonIcon icon={moon} slot="start" />
            <IonLabel>Dark Mode</IonLabel>
            <IonToggle 
              checked={darkMode} 
              onIonChange={e => handleDarkModeToggle(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonIcon icon={notifications} slot="start" />
            <IonLabel>
              <h3>Notifications</h3>
              <p>Sync status and updates</p>
            </IonLabel>
            <IonToggle 
              checked={notifications} 
              onIonChange={e => handleNotificationsToggle(e.detail.checked)}
            />
          </IonItem>

          <IonListHeader>
            <IonLabel>Storage</IonLabel>
          </IonListHeader>

          <IonItem>
            <IonIcon icon={information} slot="start" />
            <IonLabel>
              <h3>Storage Used</h3>
              <p>Offline data and photos</p>
            </IonLabel>
            <IonNote slot="end">{storageUsed}</IonNote>
          </IonItem>

          <IonItem button onClick={() => setShowClearAlert(true)}>
            <IonIcon icon={trash} slot="start" color="danger" />
            <IonLabel color="danger">Clear Offline Data</IonLabel>
          </IonItem>
        </IonList>

        <IonAlert
          isOpen={showClearAlert}
          onDidDismiss={() => setShowClearAlert(false)}
          header={'Clear Offline Data?'}
          message={'This will delete all offline poles and photos that have not been synced. This action cannot be undone.'}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Clear',
              role: 'destructive',
              handler: handleClearStorage
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;