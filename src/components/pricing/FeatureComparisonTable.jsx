import React, { useState } from 'react';

const CHECK = <span style={{ color: '#059669', fontWeight: '800', fontSize: '16px' }}>✓</span>;
const CROSS = <span style={{ color: '#cbd5e0', fontWeight: '700', fontSize: '16px' }}>✗</span>;

const ROWS = [
  { section: 'Capacity' },
  { label: 'Maximum advocates', values: ['Up to 10', 'Up to 30', 'Unlimited'] },
  { label: 'Maximum KYC clients', values: ['300', '1,000', 'Unlimited'] },
  { label: 'Maximum active matters', values: ['500', '2,000', 'Unlimited'] },
  { label: 'Document storage', values: ['25 GB', '100 GB', 'Unlimited'] },
  { section: 'Compliance Assessments' },
  { label: 'Institutional Risk Assessments / year', values: ['4', 'Unlimited', 'Unlimited'] },
  { label: 'Maturity Assessment cadence', values: ['Quarterly', 'Monthly + trending', 'Continuous'] },
  { label: 'Compliance cases / year', values: ['100', '500', 'Unlimited'] },
  { section: 'Screening' },
  { label: 'Screenings / month', values: ['1,000', '5,000', 'Unlimited'] },
  { label: 'OFAC / UN / EU / UK list screening', values: [CHECK, CHECK, CHECK] },
  { label: 'Premium screening (OpenSanctions)', values: [CROSS, CHECK, CHECK] },
  { section: 'Core Features' },
  { label: 'Client KYC/CDD management', values: [CHECK, CHECK, CHECK] },
  { label: 'Matter-based AML flagging', values: [CHECK, CHECK, CHECK] },
  { label: 'STR documentation & filing tracking', values: [CHECK, CHECK, CHECK] },
  { label: 'NIDA & BRELA verification ready', values: [CHECK, CHECK, CHECK] },
  { section: 'Security' },
  { label: 'MFA support', values: [CHECK, CHECK, CHECK] },
  { label: 'Security monitoring dashboard', values: [CHECK, CHECK, CHECK] },
  { label: 'Audit log retention', values: ['7 years', '10 years', '10 years'] },
  { section: 'Support' },
  { label: 'Response time', values: ['12 hr', '4 hr', '1 hr (SLA)'] },
  { label: 'Channels', values: ['WhatsApp + email', 'Phone + WhatsApp', '+ Dedicated CSM'] },
  { label: 'Onboarding', values: ['Video walkthrough', '2-day virtual', 'Custom program'] },
];

const TIERS = ['Small Firm', 'Medium Firm', 'Large Firm'];

export default function FeatureComparisonTable({ onTrackEvent }) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    setExpanded(e => !e);
    if (!expanded && onTrackEvent) onTrackEvent('feature_comparison_expanded', {});
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={handleExpand}
          style={{
            padding: '14px 32px', borderRadius: '10px',
            border: '2px solid #0a1929', background: expanded ? '#0a1929' : 'white',
            color: expanded ? 'white' : '#0a1929',
            fontWeight: '700', fontSize: '15px', cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
          }}
        >
          {expanded ? 'Hide' : 'See full feature comparison'}
          <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', lineHeight: 1 }}>
            ↓
          </span>
        </button>
      </div>

      {expanded && (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
            <thead>
              <tr style={{ background: '#0a1929' }}>
                <th style={{ ...th, width: '35%', textAlign: 'left', paddingLeft: '24px' }}>Feature</th>
                {TIERS.map((t, i) => (
                  <th key={t} style={{
                    ...th,
                    background: i === 1 ? '#d4af37' : '#0a1929',
                    color: i === 1 ? '#0a1929' : 'white',
                  }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                if (row.section) {
                  return (
                    <tr key={i} style={{ background: '#f8fafc' }}>
                      <td colSpan={4} style={{
                        padding: '12px 24px', fontSize: '12px', fontWeight: '800',
                        color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px',
                        borderBottom: '1px solid #e2e8f0',
                      }}>
                        {row.section}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '14px 24px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                      {row.label}
                    </td>
                    {row.values.map((v, j) => (
                      <td key={j} style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', color: '#0a1929', fontWeight: '500' }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  padding: '16px', color: 'white', fontSize: '13px',
  fontWeight: '700', textAlign: 'center', letterSpacing: '0.3px',
};
