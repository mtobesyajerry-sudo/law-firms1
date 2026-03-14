export default function LoadingSpinner({
  size = 36,
  color = '#3b82f6',
  fullPage = false,
  minHeight = '50vh'
}) {
  const containerStyle = fullPage ? {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#f7fafc'
  } : {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: minHeight,
    width: '100%'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`
      }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 50 50"
          style={{
            animation: 'spin 1s linear infinite'
          }}
        >
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
