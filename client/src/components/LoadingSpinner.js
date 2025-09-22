import React from 'react';

const LoadingSpinner = ({ size = 'medium', message, className = '' }) => {
  const sizeMap = {
    small: { width: '16px', height: '16px' },
    medium: { width: '24px', height: '24px' },
    large: { width: '32px', height: '32px' }
  };

  const spinnerStyle = {
    ...sizeMap[size],
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block'
  };

  return (
    <div className={`loading-spinner ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={spinnerStyle}></div>
      {message && <span style={{ fontSize: '14px', color: '#666' }}>{message}</span>}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
};

export default LoadingSpinner;