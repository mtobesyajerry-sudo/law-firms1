import React from 'react';

export default function LogoComponent({ style, darkBackground = false }) {
  return (
    <div style={{ ...styles.logoContainer, ...style }}>
      <div style={styles.logoText}>
        <div style={{
          ...styles.scalesContainer,
          color: darkBackground ? '#d4af37' : '#000000'
        }}>
          <svg
            width="120"
            height="80"
            viewBox="0 0 120 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: '8px' }}
          >
            {/* Left scale pan */}
            <path
              d="M20 45 L35 50 L35 52 L20 47 Z"
              fill="currentColor"
              opacity="0.8"
            />
            <ellipse cx="27.5" cy="52" rx="15" ry="3" fill="url(#goldGradient)" />

            {/* Right scale pan */}
            <path
              d="M85 45 L100 50 L100 52 L85 47 Z"
              fill="currentColor"
              opacity="0.8"
            />
            <ellipse cx="92.5" cy="52" rx="15" ry="3" fill="url(#goldGradient)" />

            {/* Balance beam */}
            <path
              d="M20 45 L100 45 L60 20 Z"
              fill="currentColor"
            />

            {/* Central pole */}
            <rect x="58" y="20" width="4" height="40" fill="url(#poleGradient)" />

            {/* Base */}
            <ellipse cx="60" cy="62" rx="25" ry="4" fill="url(#goldGradient)" />
            <path
              d="M35 60 L60 20 L85 60 Z"
              fill="currentColor"
              opacity="0.1"
            />

            {/* Left chain */}
            <line x1="27" y1="45" x2="27" y2="52" stroke="url(#goldGradient)" strokeWidth="1.5" />

            {/* Right chain */}
            <line x1="93" y1="45" x2="93" y2="52" stroke="url(#goldGradient)" strokeWidth="1.5" />

            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#f4d03f', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#d4af37', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#a4792a', stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="poleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: darkBackground ? '#d4af37' : '#000000', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: darkBackground ? '#a4792a' : '#333333', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: darkBackground ? '#d4af37' : '#000000', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div style={{
          ...styles.brandText,
          color: darkBackground ? '#ffffff' : '#0a1929'
        }}>
          IURIS PERITIS
        </div>
        <div style={{
          ...styles.underline,
          background: 'linear-gradient(90deg, #f4d03f 0%, #d4af37 50%, #a4792a 100%)'
        }}></div>
      </div>
    </div>
  );
}

const styles = {
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  scalesContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    fontFamily: 'Georgia, serif',
    textAlign: 'center',
  },
  underline: {
    width: '100%',
    height: '3px',
    borderRadius: '2px',
  },
};
