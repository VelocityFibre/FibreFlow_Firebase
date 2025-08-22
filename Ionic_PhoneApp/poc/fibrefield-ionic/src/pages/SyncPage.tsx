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
  IonButton,
  IonIcon,
  IonProgressBar,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonChip
} from '@ionic/react';
import { cloudUpload, checkmarkCircle, alertCircle, time, wifi, wifiOutline } from 'ionicons/icons';
import { Network } from '@capacitor/network';

const SyncPage: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingItems, setPendingItems] = useState([]);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    checkNetworkStatus();
    loadPendingItems();
    loadLastSyncTime();

    // Listen for network changes
    const listener = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const checkNetworkStatus = async () => {
    const status = await Network.getStatus();
    setIsOnline(status.connected);
  };

  const loadPendingItems = async () => {
    // In real app, load from SQLite/IndexedDB
    const mockPending = [
      { id: '1', poleNumber: 'LAW.P.B167', photos: 6, status: 'pending' },
      { id: '2', poleNumber: 'LAW.P.B168', photos: 4, status: 'pending' },
      { id: '3', poleNumber: 'LAW.P.B169', photos: 6, status: 'pending' }
    ];
    setPendingItems(mockPending);
  };

  const loadLastSyncTime = () => {
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      setLastSyncTime(new Date(lastSync));
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      alert('No internet connection. Please check your network.');
      return;
    }

    setSyncStatus('syncing');
    setSyncProgress(0);

    // Simulate sync process
    for (let i = 0; i < pendingItems.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSyncProgress((i + 1) / pendingItems.length);
    }

    setSyncStatus('complete');
    setLastSyncTime(new Date());
    localStorage.setItem('lastSyncTime', new Date().toISOString());
    setPendingItems([]);

    setTimeout(() => {
      setSyncStatus('idle');
    }, 2000);
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await checkNetworkStatus();
    await loadPendingItems();
    event.detail.complete();
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sync Data</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Sync Status</IonCardTitle>
            <IonCardSubtitle>
              <IonChip color={isOnline ? 'success' : 'danger'}>
                <IonIcon icon={isOnline ? wifi : wifiOutline} />
                <IonLabel>{isOnline ? 'Online' : 'Offline'}</IonLabel>
              </IonChip>
            </IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            {lastSyncTime && (
              <p>Last sync: {formatLastSync(lastSyncTime)}</p>
            )}
            <p>{pendingItems.length} items pending sync</p>
          </IonCardContent>
        </IonCard>

        {syncStatus === 'syncing' && (
          <IonProgressBar value={syncProgress}></IonProgressBar>
        )}

        <IonList>
          <IonItem>
            <IonLabel>
              <h2>Pending Uploads</h2>
              <p>{pendingItems.length} pole{pendingItems.length !== 1 ? 's' : ''} to sync</p>
            </IonLabel>
            <IonBadge slot="end" color="warning">
              {pendingItems.length}
            </IonBadge>
          </IonItem>

          {pendingItems.map(item => (
            <IonItem key={item.id}>
              <IonIcon 
                icon={alertCircle} 
                slot="start" 
                color="warning" 
              />
              <IonLabel>
                <h3>{item.poleNumber}</h3>
                <p>{item.photos} photos</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        <div style={{ padding: '16px' }}>
          <IonButton 
            expand="block" 
            onClick={handleSync}
            disabled={syncStatus === 'syncing' || pendingItems.length === 0 || !isOnline}
          >
            <IonIcon slot="start" icon={cloudUpload} />
            {syncStatus === 'syncing' ? 'Syncing...' : 
             syncStatus === 'complete' ? 'Sync Complete!' : 
             'Sync Now'}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SyncPage;