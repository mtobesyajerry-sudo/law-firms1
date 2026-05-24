import React from 'react';

export default function BillingToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <button
        type="button"
        onClick={() => onChange('monthly')}
        style={{
          padding: '10px 24px',
          borderRadius: '8px 0 0 8px',
          border: '2px solid #e2e8f0',
          borderRight: 'none',
          background: value === 'monthly' ? '#0a1929' : 'white',
          color: value === 'monthly' ? 'white' : '#64748b',
          fontWeight: '700',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        style={{
          padding: '10px 24px',
          borderRadius: '0 8px 8px 0',
          border: '2px solid #e2e8f0',
          background: value === 'annual' ? '#0a1929' : 'white',
          color: value === 'annual' ? 'white' : '#64748b',
          fontWeight: '700',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s',
        }}
      >
        Annual
        <span style={{
          background: '#d1fae5',
          color: '#065f46',
          fontSize: '11px',
          fontWeight: '800',
          padding: '2px 8px',
          borderRadius: '20px',
          letterSpacing: '0.3px',
        }}>
          SAVE 17%
        </span>
      </button>
    </div>
  );
}
