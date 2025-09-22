import React, { useState, useCallback } from 'react';

const DeckUpload = React.memo(({ onUpload, onError }) => {
  const [file, setFile] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileButtonClick = useCallback(() => {
    document.getElementById('file-upload').click();
  }, []);

  const validateFile = useCallback((file) => {
    if (!file) return 'Please select a file';

    if (!file.name.endsWith('.apkg')) {
      return 'Please select a valid Anki deck file (.apkg)';
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return 'File size must be less than 100MB';
    }

    return null;
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Clear any previous errors
    setError(null);

    // Validate inputs
    if (!deckName.trim()) {
      setError('Please enter a deck name');
      return;
    }

    if (deckName.trim().length < 2) {
      setError('Deck name must be at least 2 characters long');
      return;
    }

    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    if (!uploading) {
      setUploading(true);
      setProgress(0);

      try {
        await onUpload(file, deckName.trim(), setProgress);

        // Reset form after short delay when progress reaches 100%
        setTimeout(() => {
          setFile(null);
          setDeckName('');
          setUploading(false);
          setProgress(0);
          setError(null);
          e.target.reset();
        }, 2000);

      } catch (uploadError) {
        setUploading(false);
        setProgress(0);

        const errorMessage = uploadError.message || 'Upload failed. Please try again.';
        setError(errorMessage);

        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [onUpload, onError, validateFile, file, deckName, uploading]);

  return (
    <div>
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="deck-upload">
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="Deck Name"
          required
          disabled={uploading}
          dir="ltr"
          style={{ direction: 'ltr', textAlign: 'left' }}
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          {file ? (
            <div
              style={{
                fontSize: '12px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #e9ecef',
                whiteSpace: 'nowrap',
                marginLeft: '8px',
              }}
            >
              📁 <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </div>
          ) : (
            <button type="button" onClick={handleFileButtonClick}>Choose File</button>
          )}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".apkg"
          onChange={(e) => setFile(e.target.files[0])}
          required
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <button type="submit" disabled={uploading || !file || !deckName}>
          {uploading ? 'Processing...' : 'Upload Deck'}
        </button>
      </form>

      {uploading && (
        <div style={{ marginTop: '10px' }}>
          <div
            style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#e0e0e0',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: progress === 100 ? '#4CAF50' : '#2196F3',
                transition: 'width 0.3s ease',
                borderRadius: '10px',
              }}
            ></div>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '5px',
              textAlign: 'center',
            }}
          >
            {progress < 95
              ? '🔄 Processing cards and generating questions...'
              : progress < 100
              ? '⚡ Almost done!'
              : '✅ Upload completed!'}
          </div>
        </div>
      )}
    </div>
  );
});

DeckUpload.displayName = 'DeckUpload';

export default DeckUpload;