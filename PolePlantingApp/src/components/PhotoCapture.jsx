import React, { useState, useRef } from 'react';

const PhotoCapture = ({ photoType, label, onCapture, existingPhoto }) => {
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const processImage = async (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080, maintain aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

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
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob((blob) => {
          resolve({
            blob,
            dataUrl: canvas.toDataURL('image/jpeg', 0.8),
            size: blob.size,
            dimensions: { width, height },
            originalSize: file.size,
            timestamp: new Date()
          });
        }, 'image/jpeg', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB original)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file too large (max 10MB)');
      return;
    }

    setProcessing(true);

    try {
      const processedPhoto = await processImage(file);
      onCapture(photoType, processedPhoto);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleRetake = () => {
    onCapture(photoType, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="photo-capture">
      <div className="photo-header">
        <h4>{label}</h4>
        {existingPhoto && (
          <span className="photo-status captured">✓ Captured</span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="camera"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {existingPhoto ? (
        <div className="photo-preview">
          <img 
            src={existingPhoto.dataUrl} 
            alt={label}
            className="preview-image"
          />
          <div className="photo-info">
            <p>Size: {Math.round(existingPhoto.size / 1024)}KB</p>
            <p>Dimensions: {existingPhoto.dimensions.width}×{existingPhoto.dimensions.height}</p>
          </div>
          <button 
            onClick={handleRetake}
            className="retake-button"
            disabled={processing}
          >
            Retake Photo
          </button>
        </div>
      ) : (
        <div className="photo-placeholder">
          <div className="placeholder-content">
            <span className="camera-icon">📷</span>
            <p>Tap to capture {label.toLowerCase()}</p>
          </div>
          <button 
            onClick={handleCapture}
            disabled={processing}
            className="capture-button"
          >
            {processing ? 'Processing...' : 'Capture Photo'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoCapture;