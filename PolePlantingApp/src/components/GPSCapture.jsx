import React, { useState } from 'react';

const GPSCapture = ({ onLocationCapture, location }) => {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  const captureGPS = () => {
    setCapturing(true);
    setError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds
      maximumAge: 0 // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
          altitude: position.coords.altitude || null,
          altitudeAccuracy: position.coords.altitudeAccuracy || null,
          heading: position.coords.heading || null,
          speed: position.coords.speed || null
        };

        onLocationCapture(locationData);
        setCapturing(false);
      },
      (error) => {
        console.error('GPS Error:', error);
        let errorMessage = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'GPS access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS location unavailable. Please try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS timeout. Please try again in a better location.';
            break;
          default:
            errorMessage = 'Unknown GPS error. Please try again.';
        }
        
        setError(errorMessage);
        setCapturing(false);
      },
      options
    );
  };

  const formatCoordinate = (coord) => {
    return coord?.toFixed(6) || 'N/A';
  };

  const getAccuracyColor = (accuracy) => {
    if (!accuracy) return 'gray';
    if (accuracy <= 5) return 'green';   // Excellent
    if (accuracy <= 10) return 'orange'; // Good
    return 'red'; // Poor
  };

  return (
    <div className="gps-capture">
      <h3>GPS Location</h3>
      
      {location ? (
        <div className="gps-info">
          <div className="location-display">
            <p><strong>Latitude:</strong> {formatCoordinate(location.latitude)}°</p>
            <p><strong>Longitude:</strong> {formatCoordinate(location.longitude)}°</p>
            <p>
              <strong>Accuracy:</strong> 
              <span style={{ color: getAccuracyColor(location.accuracy) }}>
                {location.accuracy ? `±${Math.round(location.accuracy)}m` : 'Unknown'}
              </span>
            </p>
            <p><strong>Captured:</strong> {location.timestamp?.toLocaleString()}</p>
            {location.altitude && (
              <p><strong>Altitude:</strong> {Math.round(location.altitude)}m</p>
            )}
          </div>
          <button 
            onClick={captureGPS}
            disabled={capturing}
            className="recapture-button"
          >
            {capturing ? 'Capturing GPS...' : 'Recapture Location'}
          </button>
        </div>
      ) : (
        <div className="gps-placeholder">
          <div className="gps-icon">📍</div>
          <p>GPS location not captured</p>
          <button 
            onClick={captureGPS}
            disabled={capturing}
            className="capture-gps-button"
          >
            {capturing ? 'Capturing GPS...' : 'Capture GPS Location'}
          </button>
        </div>
      )}

      {error && (
        <div className="gps-error">
          <p>{error}</p>
          <small>
            Make sure you're in an area with good GPS signal and that location permissions are enabled.
          </small>
        </div>
      )}

      {capturing && (
        <div className="gps-status">
          <p>📡 Acquiring GPS signal...</p>
          <small>This may take up to 30 seconds</small>
        </div>
      )}
    </div>
  );
};

export default GPSCapture;