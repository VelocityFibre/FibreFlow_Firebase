import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import PhotoCapture from './PhotoCapture';
import GPSCapture from './GPSCapture';

const PoleCapture = ({ projectId, resumingPole, onClearResume }) => {
  const [poleNumber, setPoleNumber] = useState('');
  const [gpsLocation, setGpsLocation] = useState(null);
  const [photos, setPhotos] = useState({
    before: null,
    front: null,
    side: null,
    depth: null,
    concrete: null,
    compaction: null
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  
  // Load data when resuming a pole
  useEffect(() => {
    if (resumingPole) {
      setPoleNumber(resumingPole.poleNumber || '');
      setGpsLocation(resumingPole.gpsLocation || null);
      setPhotos(resumingPole.photos || {
        before: null,
        front: null,
        side: null,
        depth: null,
        concrete: null,
        compaction: null
      });
      setStatus('Resuming pole capture...');
    }
  }, [resumingPole]);

  const photoTypes = [
    { key: 'before', label: 'Before Installation' },
    { key: 'front', label: 'Front View' },
    { key: 'side', label: 'Side View' },
    { key: 'depth', label: 'Installation Depth' },
    { key: 'concrete', label: 'Concrete Base' },
    { key: 'compaction', label: 'Ground Compaction' }
  ];

  const handlePhotoCapture = (photoType, photoData) => {
    setPhotos(prev => ({
      ...prev,
      [photoType]: photoData
    }));
  };

  const handleSave = async () => {
    if (!poleNumber.trim()) {
      setStatus('Please enter a pole number');
      return;
    }

    if (!gpsLocation) {
      setStatus('Please capture GPS location');
      return;
    }

    // Check if all photos are captured
    const missingPhotos = photoTypes.filter(type => !photos[type.key]);
    if (missingPhotos.length > 0) {
      setStatus(`Missing photos: ${missingPhotos.map(p => p.label).join(', ')}`);
      return;
    }

    setSaving(true);
    setStatus('Saving pole data...');

    try {
      const poleData = {
        projectId,
        poleNumber: poleNumber.trim(),
        gpsLocation,
        photos,
        status: 'ready-for-sync',
        updatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      if (resumingPole?.id) {
        // Update existing pole
        await updateDoc(doc(db, 'pole-plantings-staging', resumingPole.id), poleData);
        setStatus('Pole data updated successfully!');
      } else {
        // Create new pole
        poleData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'pole-plantings-staging'), poleData);
        setStatus('Pole data saved successfully!');
      }
      
      // Clear resuming state
      if (onClearResume) {
        onClearResume();
      }
      
      // Reset form
      setPoleNumber('');
      setGpsLocation(null);
      setPhotos({
        before: null,
        front: null,
        side: null,
        depth: null,
        concrete: null,
        compaction: null
      });
      
    } catch (error) {
      console.error('Error saving pole data:', error);
      setStatus('Error saving data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = poleNumber.trim() && gpsLocation && 
    photoTypes.every(type => photos[type.key]);

  return (
    <div className="pole-capture">
      <h2>Pole Capture</h2>
      
      {resumingPole && (
        <div className="resuming-banner">
          <p>🔄 Resuming capture for pole: <strong>{resumingPole.poleNumber || 'Unnamed Pole'}</strong></p>
          <button 
            onClick={onClearResume}
            className="clear-resume-button"
          >
            Start New Capture
          </button>
        </div>
      )}
      
      {/* Pole Number Input */}
      <div className="pole-number-input">
        <label htmlFor="pole-number">Pole Number:</label>
        <input
          id="pole-number"
          type="text"
          value={poleNumber}
          onChange={(e) => setPoleNumber(e.target.value)}
          placeholder="Enter pole number (e.g. LAW.P.B167)"
          className="pole-input"
        />
      </div>

      {/* GPS Capture */}
      <GPSCapture onLocationCapture={setGpsLocation} location={gpsLocation} />

      {/* Photo Captures */}
      <div className="photo-captures">
        <h3>Required Photos ({Object.values(photos).filter(Boolean).length}/6)</h3>
        {photoTypes.map(photoType => (
          <PhotoCapture
            key={photoType.key}
            photoType={photoType.key}
            label={photoType.label}
            onCapture={handlePhotoCapture}
            existingPhoto={photos[photoType.key]}
          />
        ))}
      </div>

      {/* Save Button */}
      <div className="save-section">
        <button 
          onClick={handleSave}
          disabled={saving || !isComplete}
          className={`save-button ${isComplete ? 'complete' : 'incomplete'}`}
        >
          {saving ? 'Saving...' : 'Save Pole Data'}
        </button>
        {status && <p className="status-message">{status}</p>}
      </div>
    </div>
  );
};

export default PoleCapture;