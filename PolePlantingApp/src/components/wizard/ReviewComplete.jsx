import React, { useState } from 'react';

function ReviewComplete({ data, onUpdate, onBack, onComplete, isLastStep }) {
  const [notes, setNotes] = useState(data.notes || '');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleNotesChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    onUpdate({ notes: value });
  };

  const handleComplete = async () => {
    setIsSyncing(true);
    
    try {
      // In real app, this would sync to Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete();
    } catch (error) {
      console.error('Error completing capture:', error);
      setIsSyncing(false);
    }
  };

  const getPhotoCount = () => {
    const photos = [
      data.beforePhoto?.captured,
      data.depthPhoto?.captured,
      data.compactionPhoto?.captured,
      data.concretePhoto?.captured,
      data.frontPhoto?.captured,
      data.sidePhoto?.captured
    ];
    return photos.filter(Boolean).length;
  };

  const formatGPSLocation = () => {
    if (!data.gpsLocation) return 'Not captured';
    return `${data.gpsLocation.latitude.toFixed(6)}, ${data.gpsLocation.longitude.toFixed(6)}`;
  };

  return (
    <div className="wizard-step review-complete">
      <h2>Review & Complete</h2>
      <p className="subtitle">Review your pole installation capture</p>

      {/* Additional Notes */}
      <div className="form-group">
        <label>Additional Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Any additional observations, issues, or special conditions..."
          className="notes-textarea"
          rows={4}
        />
      </div>

      {/* Installation Summary */}
      <div className="summary-section">
        <h3>Installation Summary</h3>
        <div className="summary-items">
          <div className="summary-item">
            <span className="label">Project:</span>
            <span className="value">{data.projectName || 'No project'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Pole Number:</span>
            <span className="value">{data.poleNumber || 'Not entered'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Photos Captured:</span>
            <span className="value">{getPhotoCount()}</span>
          </div>
          <div className="summary-item">
            <span className="label">GPS Location:</span>
            <span className="value">{formatGPSLocation()}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="navigation-buttons">
        <button 
          className="btn-secondary"
          onClick={onBack}
          disabled={isSyncing}
        >
          Back
        </button>
        <button 
          className="btn-success"
          onClick={handleComplete}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : '✓ Complete Capture'}
        </button>
      </div>
    </div>
  );
}

export default ReviewComplete;