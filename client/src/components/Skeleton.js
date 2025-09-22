import React from 'react';

const SkeletonBase = ({ width = '100%', height = '20px', borderRadius = '4px', className = '', style = {} }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#f0f0f0',
        backgroundImage: 'linear-gradient(90deg, #f0f0f0 0px, #e0e0e0 40px, #f0f0f0 80px)',
        backgroundSize: '300px',
        animation: 'skeleton-loading 1.5s infinite',
        ...style
      }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes skeleton-loading {
            0% {
              background-position: -300px 0;
            }
            100% {
              background-position: 300px 0;
            }
          }
        `
      }} />
    </div>
  );
};

export const SkeletonText = ({ lines = 1, width = '100%' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonBase
        key={index}
        width={index === lines - 1 ? '70%' : width}
        height="16px"
      />
    ))}
  </div>
);

export const SkeletonButton = ({ width = '120px', height = '36px' }) => (
  <SkeletonBase width={width} height={height} borderRadius="6px" />
);

export const SkeletonCard = ({ showImage = false }) => (
  <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
    {showImage && <SkeletonBase height="120px" style={{ marginBottom: '12px' }} />}
    <SkeletonBase width="60%" height="24px" style={{ marginBottom: '8px' }} />
    <SkeletonText lines={2} />
    <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
      <SkeletonButton />
      <SkeletonButton width="80px" />
    </div>
  </div>
);

export const SkeletonUserProfile = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
    <SkeletonBase width="40px" height="40px" borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <SkeletonBase width="120px" height="18px" style={{ marginBottom: '4px' }} />
      <SkeletonBase width="80px" height="14px" />
    </div>
  </div>
);

export const SkeletonDeck = () => (
  <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '12px' }}>
    <SkeletonBase width="200px" height="20px" style={{ marginBottom: '8px' }} />
    <SkeletonText lines={2} />
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <SkeletonBase width="80px" height="16px" />
        <SkeletonBase width="120px" height="24px" />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonBase key={i} width="100px" height="20px" borderRadius="10px" />
        ))}
      </div>
      <SkeletonButton width="150px" height="40px" />
    </div>
  </div>
);

export const SkeletonQuestion = () => (
  <div style={{ padding: '20px' }}>
    <SkeletonBase width="150px" height="14px" style={{ marginBottom: '16px' }} />
    <SkeletonBase width="100%" height="24px" style={{ marginBottom: '20px' }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SkeletonBase width="20px" height="20px" borderRadius="50%" />
          <SkeletonBase width="200px" height="16px" />
        </div>
      ))}
    </div>
    <SkeletonButton width="120px" style={{ marginTop: '24px' }} />
  </div>
);

export default SkeletonBase;