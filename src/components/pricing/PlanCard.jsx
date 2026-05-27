import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TIER_FEATURES = {
  small_firm: [
    'Run client KYC/CDD the way AMLA Cap. 423 requires',
    'Automatically screen clients against UN, EU, UK, and OFAC sanctions lists, refreshed daily',
    'Manage matters with automatic AML trigger flagging across 10 matter types',
    'Generate your annual Institutional Risk Assessment automatically',
    '47-control Maturity Assessment across 9 weighted AML/CFT domains',
    'Track suspicious activity and document STR filings with multi-level approval',
    'Secure document storage with dual-control verification and SHA-256 integrity',
    'MFA-protected accounts with backup codes',
    '10-year audit trail per AMLA retention requirement',
  ],
  medium_firm: [
    'Everything in Small Firm',
    'Premium PEP and adverse media screening via OpenSanctions',
    'Quarterly Institutional Risk Assessment reviews instead of annual',
    'Up to 30 system users (advocates, paralegals, staff, compliance)',
    'Required MFA enforcement with session elevation for sensitive actions',
    'Priority email, WhatsApp, and phone support (4-hour response)',
    'Quarterly compliance review session with our team',
  ],
  large_firm: [
    'Everything in Medium Firm',
    'Unlimited users, clients, matters, assessments, and screenings',
    'Dedicated account manager who knows your firm',
    'Custom onboarding program tailored to your structure',
    'Quarterly training sessions (virtual or on-site)',
    'Quarterly compliance review with written report for board reporting',
    'Priority response SLA (1-hour during business hours)',
  ],
};

function formatTZS(n) {
  if (!n) return null;
  return Number(n).toLocaleString('en-TZ');
}

export default function PlanCard({ plan, user, profile, organization, onContactSales, onTrackEvent }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const isCurrent = organization?.subscription_tier === plan.tier && !organization?.is_trialing;
  const isCurrentTrial = organization?.is_trialing && organization?.subscription_tier === plan.tier;

  const getCta = () => {
    if (plan.contact_sales) {
      return { label: 'Contact sales', action: 'contact_sales', disabled: false };
    }
    if (!user) {
      return { label: 'Start 14-day free trial', action: 'signup', disabled: false };
    }
    if (profile?.role === 'admin') {
      return { label: 'Admin view', action: null, disabled: true };
    }
    if (isCurrentTrial) {
      return { label: 'Your current trial', action: null, disabled: true };
    }
    if (isCurrent) {
      return { label: 'Current plan ✓', action: null, disabled: true };
    }
    if (organization?.has_used_trial && !organization?.is_trialing) {
      const currentTierOrder = ['small_firm', 'medium_firm', 'large_firm'].indexOf(organization.subscription_tier);
      const thisTierOrder = ['small_firm', 'medium_firm', 'large_firm'].indexOf(plan.tier);
      if (thisTierOrder > currentTierOrder) return { label: 'Upgrade to this plan', action: 'upgrade', disabled: false };
      if (thisTierOrder < currentTierOrder) return { label: 'Downgrade', action: 'downgrade', disabled: false };
      return { label: 'Pay to activate', action: 'checkout', disabled: false };
    }
    if (organization?.is_trialing) {
      return { label: 'Subscribe to this plan', action: 'checkout', disabled: false };
    }
    return { label: 'Start 14-day free trial', action: 'signup', disabled: false };
  };

  const cta = getCta();

  const handleCta = () => {
    if (cta.disabled || !cta.action) return;
    if (onTrackEvent) onTrackEvent('plan_card_cta_clicked', { tier: plan.tier, action: cta.action });
    if (cta.action === 'contact_sales') { onContactSales(); return; }
    if (cta.action === 'signup') { navigate(`/auth?plan=${plan.tier}`); return; }
    if (cta.action === 'checkout') { navigate(`/billing/checkout?plan=${plan.tier}`); return; }
    if (cta.action === 'upgrade') { navigate(`/billing/upgrade?plan=${plan.tier}`); return; }
    if (cta.action === 'downgrade') { navigate(`/billing/downgrade?plan=${plan.tier}`); return; }
  };

  const advocateRange = plan.features?.advocate_range;

  const capacityRows = [
    { label: 'Advocates', value: advocateRange ? (advocateRange === '16+' ? '16+' : `Up to ${advocateRange.split('-')[1]}`) : '—' },
    { label: 'System users', value: plan.max_users != null ? `Up to ${plan.max_users}` : 'Unlimited' },
    { label: 'KYC clients', value: plan.max_clients != null ? `Up to ${Number(plan.max_clients).toLocaleString()}` : 'Unlimited' },
    { label: 'Active matters', value: plan.max_matters != null ? `Up to ${Number(plan.max_matters).toLocaleString()}` : 'Unlimited' },
    { label: 'IRAs/year', value: plan.max_iras_per_year != null ? plan.max_iras_per_year : 'Unlimited' },
    { label: 'Screenings/month', value: plan.max_screenings_per_month != null ? Number(plan.max_screenings_per_month).toLocaleString() : 'Unlimited' },
    { label: 'Storage', value: plan.storage_gb != null ? `${plan.storage_gb} GB` : 'Unlimited' },
  ];

  const features = TIER_FEATURES[plan.tier] || [];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#0a1929' }}>
          {plan.display_name || plan.name}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
          {plan.description}
        </p>
      </div>

      {/* Price block */}
      <div style={{ marginBottom: '28px', minHeight: '88px' }}>
        {plan.contact_sales ? (
          <>
            <div style={{ fontSize: '40px', fontWeight: '800', color: '#0a1929', lineHeight: 1 }}>Let's talk</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>We'll build you a quote</div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>TZS</span>
              <span style={{ fontSize: '36px', fontWeight: '800', color: '#0a1929', lineHeight: 1 }}>
                {formatTZS(plan.price_monthly_tzs)}
              </span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>/month</span>
            </div>
            {plan.price_annual_tzs && (() => {
              const monthly12 = Number(plan.price_monthly_tzs) * 12;
              const annual    = Number(plan.price_annual_tzs);
              const savePct   = monthly12 > annual ? Math.round((monthly12 - annual) / monthly12 * 100) : 0;
              return (
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  or <strong style={{ color: '#0a1929' }}>TZS {formatTZS(plan.price_annual_tzs)}/year</strong>
                  {savePct > 0 && (
                    <span style={{
                      background: '#d1fae5', color: '#065f46',
                      fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px',
                    }}>
                      save {savePct}%
                    </span>
                  )}
                </div>
              );
            })()}
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>VAT inclusive</div>
          </>
        )}
      </div>

      {/* Capacity table */}
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px' }}>
        {capacityRows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>{label}</span>
            <span style={{ color: '#0a1929', fontWeight: '700' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <ul style={{ margin: '0 0 28px', padding: 0, listStyle: 'none', flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', fontSize: '14px', color: '#374151' }}>
            <span style={{ color: '#d4af37', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={handleCta}
        disabled={cta.disabled}
        style={{
          width: '100%', padding: '14px',
          borderRadius: '10px', border: 'none',
          fontWeight: '700', fontSize: '15px',
          cursor: cta.disabled ? 'default' : 'pointer',
          background: cta.disabled ? '#e2e8f0' : '#0a1929',
          color: cta.disabled ? '#94a3b8' : 'white',
          transition: 'opacity 0.15s',
        }}
      >
        {cta.label}
      </button>

      {!plan.contact_sales && !cta.disabled && (
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
          14-day free trial · No card required
        </p>
      )}
    </div>
  );
}
