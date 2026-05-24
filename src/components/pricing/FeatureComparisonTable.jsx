import React, { useState } from 'react';

const CHECK = <span style={{ color: '#059669', fontWeight: '800', fontSize: '16px' }}>✓</span>;
const CROSS = <span style={{ color: '#cbd5e0', fontWeight: '700', fontSize: '16px' }}>✗</span>;

const ROWS = [
  { section: 'Capacity' },
  { label: 'Maximum users', values: ['3', '12', '30', 'Unlimited'] },
  { label: 'Maximum KYC clients', values: ['75', '300', '1,000', 'Unlimited'] },
  { label: 'Maximum active matters', values: ['100', '500', '2,000', 'Unlimited'] },
  { label: 'Document storage', values: ['5 GB', '25 GB', '100 GB', '500+ GB'] },
  { label: 'Maximum branches', values: ['1', '1', '3', 'Unlimited'] },
  { section: 'Compliance Assessments' },
  { label: 'Finalized IRAs per year', values: ['2', '4', 'Unlimited', 'Unlimited'] },
  { label: 'Maturity Assessment', values: ['Annual', 'Quarterly', 'Monthly + trending', 'Continuous + benchmarking'] },
  { label: 'Compliance cases per year', values: ['25', '100', '500', 'Unlimited'] },
  { label: 'Screenings per month', values: ['200', '1,000', '5,000', 'Unlimited'] },
  { section: 'Features' },
  { label: 'Client KYC/CDD management', values: [CHECK, CHECK, CHECK, CHECK] },
  { label: 'Matter-based AML flagging', values: [CHECK, CHECK, CHECK, CHECK] },
  { label: 'STR documentation', values: [CHECK, CHECK, CHECK, CHECK] },
  { label: 'STR bulk filing', values: [CROSS, CROSS, CHECK, CHECK] },
  { label: 'Workflow automation', values: [CROSS, CROSS, CHECK, CHECK] },
  { label: 'Multi-branch consolidation', values: [CROSS, CROSS, CHECK, CHECK] },
  { label: 'White-label reports', values: [CROSS, CROSS, CROSS, CHECK] },
  { section: 'Security' },
  { label: 'MFA enforcement', values: ['Optional', 'Recommended', 'Required', 'Required'] },
  { label: 'Security monitoring dashboard', values: ['View only', CHECK, CHECK, CHECK] },
  { label: 'Intrusion detection', values: [CROSS, CHECK, CHECK, '✓ + custom rules'] },
  { label: 'Audit log retention', values: ['5 years', '7 years', '10 years', '10+ years'] },
  { section: 'Integration' },
  { label: 'NIDA / BRELA integration ready', values: [CHECK, CHECK, CHECK, CHECK] },
  { label: 'API access', values: [CROSS, 'Read-only', 'Full', 'Full + webhooks'] },
  { label: 'Custom integrations', values: [CROSS, CROSS, CROSS, CHECK] },
  { section: 'Support' },
  { label: 'Response time', values: ['24 hr', '12 hr', '4 hr', '1 hr (SLA)'] },
  { label: 'Channels', values: ['Email', 'Email + WhatsApp', '+ Phone', '+ Dedicated CSM'] },
  { label: 'Onboarding', values: ['Video walkthrough', '1-day virtual', '2-day on-site', 'Custom program'] },
];

const TIERS = ['Solo Advocate', 'Small Firm', 'Medium Firm', 'Large Firm'];

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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
            <thead>
              <tr style={{ background: '#0a1929' }}>
                <th style={{ ...th, width: '30%', textAlign: 'left', paddingLeft: '24px' }}>Feature</th>
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
                      <td colSpan={5} style={{
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
