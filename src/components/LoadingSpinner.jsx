export default function LoadingSpinner({ size = 40, color = '#3b82f6', text = 'Loading...', fullscreen = false }) {
  const containerStyle = fullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 9999,
    gap: '20px'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`
      }}>
        {/* Dual rotating circles */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 50 50"
          style={{
            animation: 'spin 1s linear infinite'
          }}
        >
          {/* Outer circle */}
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray="31.4 31.4"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>

        {/* Inner counter-rotating circle */}
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 50 50"
          style={{
            position: 'absolute',
            top: '15%',
            left: '15%',
            animation: 'spinReverse 0.8s linear infinite'
          }}
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray="20 20"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>

      {text && (
        <div style={{
          color: color,
          fontSize: '15px',
          fontWeight: '600',
          textAlign: 'center',
          letterSpacing: '0.3px'
        }}>
          {text}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes spinReverse {
            from {
              transform: rotate(360deg);
            }
            to {
              transform: rotate(0deg);
            }
          }
        `}
      </style>
    </div>
  );
}
