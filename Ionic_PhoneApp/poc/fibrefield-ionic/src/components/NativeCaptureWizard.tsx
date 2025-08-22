import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonCheckbox,
  IonTextarea,
  IonInput,
  IonAlert,
  IonToast,
  IonFab,
  IonFabButton,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonChip,
  IonBadge
} from '@ionic/react';
import {
  camera,
  checkmarkCircle,
  location,
  save,
  arrowBack,
  alertCircle,
  refresh,
  ellipse
} from 'ionicons/icons';
import { cameraService, PhotoWithMetadata } from '../services/camera-native.service';
import { storageService, PoleData } from '../services/storage-native.service';

interface Props {
  project: any;
  resumingPole?: PoleData | null;
  onBack: () => void;
  onComplete: () => void;
}

interface CaptureStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  photo?: PhotoWithMetadata;
  completed: boolean;
}

const NativeCaptureWizard: React.FC<Props> = ({
  project,
  resumingPole,
  onBack,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [poleNumber, setPoleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [gpsLocation, setGpsLocation] = useState<any>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const [steps, setSteps] = useState<CaptureStep[]>([
    {
      id: 'before',
      name: 'Before Installation',
      description: 'Take a photo of the site before installation begins',
      required: true,
      completed: false
    },
    {
      id: 'front',
      name: 'Front View',
      description: 'Front view of the installed pole',
      required: true,
      completed: false
    },
    {
      id: 'side',
      name: 'Side View',
      description: 'Side angle view of the pole installation',
      required: true,
      completed: false
    },
    {
      id: 'depth',
      name: 'Installation Depth',
      description: 'Photo showing the correct installation depth',
      required: true,
      completed: false
    },
    {
      id: 'concrete',
      name: 'Concrete Base',
      description: 'Photo of the concrete foundation/base',
      required: true,
      completed: false
    },
    {
      id: 'compaction',
      name: 'Ground Compaction',
      description: 'Photo showing proper ground compaction around pole',
      required: true,
      completed: false
    }
  ]);

  useEffect(() => {
    initializeCapture();
  }, []);

  useEffect(() => {
    if (resumingPole) {
      loadResumedPole();
    }
  }, [resumingPole]);

  const initializeCapture = async () => {
    try {
      // Initialize storage service
      await storageService.initialize();

      // Check permissions
      const permissions = await cameraService.checkPermissions();
      if (!permissions.camera || !permissions.location) {
        const granted = await cameraService.requestPermissions();
        setPermissionsGranted(granted);
        if (!granted) {
          setAlertMessage('Camera and location permissions are required for pole capture.');
          setShowAlert(true);
          return;
        }
      } else {
        setPermissionsGranted(true);
      }
    } catch (error) {
      console.error('Failed to initialize capture:', error);
      setAlertMessage('Failed to initialize capture system. Please try again.');
      setShowAlert(true);
    }
  };

  const loadResumedPole = () => {
    if (!resumingPole) return;

    setPoleNumber(resumingPole.poleNumber);
    setNotes(resumingPole.notes);
    setGpsLocation(resumingPole.gpsLocation);

    // Mark completed steps
    const updatedSteps = steps.map(step => {
      const hasPhoto = resumingPole.photos[step.id];
      return {
        ...step,
        completed: !!hasPhoto,
        photo: hasPhoto ? { base64: '', webPath: hasPhoto, format: 'jpeg', saved: true } : undefined
      };
    });

    setSteps(updatedSteps);
  };

  const takePhoto = async (stepIndex: number) => {
    if (!permissionsGranted) {
      setAlertMessage('Permissions required. Please enable camera and location access.');
      setShowAlert(true);
      return;
    }

    try {
      const step = steps[stepIndex];
      const photo = await cameraService.takePolePhoto(step.id, {
        quality: cameraService.getPhotoQuality()
      });

      // Update GPS location from first photo
      if (photo.gpsLocation && !gpsLocation) {
        setGpsLocation(photo.gpsLocation);
      }

      // Update step with photo
      const updatedSteps = [...steps];
      updatedSteps[stepIndex] = {
        ...step,
        photo,
        completed: true
      };
      setSteps(updatedSteps);

      setToastMessage(`${step.name} photo captured successfully!`);
      setShowToast(true);

    } catch (error) {
      console.error('Failed to take photo:', error);
      setAlertMessage(`Failed to capture ${steps[stepIndex].name} photo. Please try again.`);
      setShowAlert(true);
    }
  };

  const retakePhoto = async (stepIndex: number) => {
    await takePhoto(stepIndex);
  };

  const savePoleData = async () => {
    if (!canSave()) return;

    setIsSaving(true);
    try {
      const poleId = resumingPole?.id || `pole_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const poleData: PoleData = {
        id: poleId,
        poleNumber: poleNumber.trim(),
        projectId: project.id,
        projectName: project.name,
        gpsLocation: gpsLocation || steps.find(s => s.photo?.gpsLocation)?.photo?.gpsLocation || {
          latitude: 0,
          longitude: 0,
          accuracy: 0
        },
        notes: notes.trim(),
        status: isComplete() ? 'complete' : 'incomplete',
        photos: {},
        createdAt: resumingPole?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      // Save pole data
      await storageService.savePole(poleData);

      // Save photos to file system
      for (const step of steps) {
        if (step.photo && step.photo.base64) {
          const filePath = await storageService.savePhoto(
            poleId,
            step.id,
            step.photo.base64
          );
          poleData.photos[step.id] = filePath;
        }
      }

      // Update pole with photo paths
      await storageService.savePole(poleData);

      setToastMessage('Pole data saved successfully!');
      setShowToast(true);

      // Auto-advance or complete
      if (isComplete()) {
        setTimeout(() => {
          onComplete();
        }, 1500);
      }

    } catch (error) {
      console.error('Failed to save pole data:', error);
      setAlertMessage('Failed to save pole data. Please try again.');
      setShowAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = (): boolean => {
    return (
      poleNumber.trim().length > 0 &&
      gpsLocation !== null &&
      steps.some(s => s.completed)
    );
  };

  const isComplete = (): boolean => {
    return steps.filter(s => s.required).every(s => s.completed);
  };

  const getProgress = (): number => {
    const completedRequired = steps.filter(s => s.required && s.completed).length;
    const totalRequired = steps.filter(s => s.required).length;
    return totalRequired > 0 ? completedRequired / totalRequired : 0;
  };

  const getStepIcon = (step: CaptureStep) => {
    if (step.completed) {
      return <IonIcon icon={checkmarkCircle} color="success" />;
    } else if (step.required) {
      return <IonIcon icon={ellipse} color="danger" />;
    } else {
      return <IonIcon icon={ellipse} color="medium" />;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton
            slot="start"
            fill="clear"
            onClick={onBack}
          >
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>
            {resumingPole ? 'Resume Capture' : 'New Pole Capture'}
          </IonTitle>
          <IonChip slot="end" color={isComplete() ? 'success' : 'primary'}>
            {Math.round(getProgress() * 100)}%
          </IonChip>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonProgressBar value={getProgress()}></IonProgressBar>

        {/* Project Info */}
        <IonCard>
          <IonCardHeader>
            <IonCardSubtitle>{project.name}</IonCardSubtitle>
            <IonCardTitle>Pole Information</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Pole Number *</IonLabel>
              <IonInput
                value={poleNumber}
                onIonInput={(e) => setPoleNumber(e.detail.value!)}
                placeholder="Enter pole number (e.g., LAW.P.B167)"
              />
            </IonItem>

            {gpsLocation && (
              <IonItem>
                <IonIcon icon={location} slot="start" color="success" />
                <IonLabel>
                  <h3>GPS Location</h3>
                  <p>
                    {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    <br />
                    Accuracy: {gpsLocation.accuracy.toFixed(0)}m
                  </p>
                </IonLabel>
              </IonItem>
            )}

            <IonItem>
              <IonLabel position="stacked">Notes</IonLabel>
              <IonTextarea
                value={notes}
                onIonInput={(e) => setNotes(e.detail.value!)}
                placeholder="Additional notes about this pole installation..."
                rows={3}
              />
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* Photo Steps */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Required Photos</IonCardTitle>
            <IonCardSubtitle>
              {steps.filter(s => s.completed).length} of {steps.length} completed
            </IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              {steps.map((step, index) => (
                <IonItem key={step.id}>
                  {getStepIcon(step)}
                  <IonLabel className="ion-margin-start">
                    <h3>{step.name}</h3>
                    <p>{step.description}</p>
                    {step.photo?.gpsLocation && (
                      <p>
                        <small>
                          GPS: {step.photo.gpsLocation.latitude.toFixed(4)}, 
                          {step.photo.gpsLocation.longitude.toFixed(4)}
                        </small>
                      </p>
                    )}
                  </IonLabel>
                  <div slot="end">
                    {step.completed ? (
                      <IonButton
                        size="small"
                        fill="outline"
                        onClick={() => retakePhoto(index)}
                      >
                        <IonIcon icon={refresh} slot="icon-only" />
                      </IonButton>
                    ) : (
                      <IonButton
                        size="small"
                        onClick={() => takePhoto(index)}
                      >
                        <IonIcon icon={camera} slot="start" />
                        Capture
                      </IonButton>
                    )}
                  </div>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Photo Thumbnails */}
        {steps.some(s => s.completed) && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Captured Photos</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  {steps
                    .filter(s => s.completed && s.photo)
                    .map(step => (
                      <IonCol size="6" key={step.id}>
                        <div style={{ position: 'relative' }}>
                          <IonImg 
                            src={`data:image/jpeg;base64,${step.photo?.base64}`}
                            style={{ 
                              borderRadius: '8px',
                              aspectRatio: '4/3',
                              objectFit: 'cover'
                            }}
                          />
                          <IonBadge
                            color="primary"
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              fontSize: '0.7em'
                            }}
                          >
                            {step.name}
                          </IonBadge>
                        </div>
                      </IonCol>
                    ))
                  }
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {/* Save Button */}
        <div style={{ padding: '16px' }}>
          <IonButton
            expand="block"
            onClick={savePoleData}
            disabled={!canSave() || isSaving}
            color={isComplete() ? 'success' : 'primary'}
          >
            <IonIcon 
              icon={isComplete() ? checkmarkCircle : save} 
              slot="start" 
            />
            {isSaving ? 'Saving...' : 
             isComplete() ? 'Complete & Save' : 'Save Progress'}
          </IonButton>
        </div>

        {/* Alerts and Toasts */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Alert"
          message={alertMessage}
          buttons={['OK']}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default NativeCaptureWizard;