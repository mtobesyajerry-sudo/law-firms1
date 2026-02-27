export default function LoadingSpinner({ size = 40, color = '#64748b', text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    }}>
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
            animation: 'spin 1.2s linear infinite'
          }}
        >
          <path
            d="M 25,5 A 20,20 0 0,1 45,25"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 25,5 A 20,20 0 0,1 45,25"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.3"
            style={{
              transform: 'rotate(180deg)',
              transformOrigin: '25px 25px'
            }}
          />
        </svg>
      </div>

      {text && (
        <div style={{
          color: color,
          fontSize: '14px',
          fontWeight: '500',
          textAlign: 'center'
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
        `}
      </style>
    </div>
  );
}
