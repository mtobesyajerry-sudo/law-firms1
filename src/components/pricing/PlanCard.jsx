import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TIER_FEATURES = {
  small_firm: [
    'Client KYC/CDD management',
    'Matter-based AML flagging',
    'STR documentation & filing tracking',
    'Institutional Risk Assessment (up to 4/yr)',
    'Maturity Assessment (quarterly)',
    'Security monitoring dashboard',
    'NIDA & BRELA verification ready',
    'WhatsApp & email support',
  ],
  medium_firm: [
    'Everything in Small Firm',
    'Unlimited Institutional Risk Assessments',
    'Maturity Assessment (monthly + trending)',
    'Premium sanctions screening (OpenSanctions)',
    'Compliance case management (up to 500/yr)',
    'Priority support — phone + WhatsApp, 4hr response',
  ],
  large_firm: [
    'Everything in Medium Firm',
    'Unlimited users, clients & matters',
    'Dedicated Customer Success Manager',
    'Custom onboarding & staff training',
    '99.9% uptime SLA',
    'Bespoke implementation support',
  ],
};

function formatTZS(n) {
  if (!n) return null;
  return `TZS ${Number(n).toLocaleString('en-TZ')}`;
}

function roundToThousand(n) {
  return Math.round(n / 1000) * 1000;
}

export default function PlanCard({ plan, billingPeriod, user, profile, organization, onContactSales, onTrackEvent }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const isMostPopular = plan.tier === 'medium_firm';
  const isCurrent = organization?.subscription_tier === plan.tier && !organization?.is_trialing;
  const isCurrentTrial = organization?.is_trialing && organization?.subscription_tier === plan.tier;

  const monthlyEquiv = plan.price_annual_tzs
    ? roundToThousand(plan.price_annual_tzs / 12)
    : null;
  const displayPrice = billingPeriod === 'annual' ? monthlyEquiv : plan.price_monthly_tzs;
  const annualTotal = plan.price_annual_tzs;

  // CTA logic
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
      // Trial expired or paying customer
      const currentTierOrder = ['small_firm', 'medium_firm', 'large_firm'].indexOf(organization.subscription_tier);
      const thisTierOrder = ['small_firm', 'medium_firm', 'large_firm'].indexOf(plan.tier);
      if (thisTierOrder > currentTierOrder) {
        return { label: 'Upgrade to this plan', action: 'upgrade', disabled: false };
      }
      if (thisTierOrder < currentTierOrder) {
        return { label: 'Downgrade', action: 'downgrade', disabled: false };
      }
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
    if (onTrackEvent) onTrackEvent('plan_card_cta_clicked', { tier: plan.tier, billing_period: billingPeriod, action: cta.action });
    if (cta.action === 'contact_sales') { onContactSales(); return; }
    if (cta.action === 'signup') { navigate(`/auth?plan=${plan.tier}`); return; }
    if (cta.action === 'checkout') { navigate(`/billing/checkout?plan=${plan.tier}&period=${billingPeriod}`); return; }
    if (cta.action === 'upgrade') { navigate(`/billing/upgrade?plan=${plan.tier}`); return; }
    if (cta.action === 'downgrade') { navigate(`/billing/downgrade?plan=${plan.tier}`); return; }
  };

  const features = TIER_FEATURES[plan.tier] || [];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: '16px',
        border: isMostPopular ? '2px solid #d4af37' : '1px solid #e2e8f0',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 16px 40px rgba(0,0,0,0.12)'
          : isMostPopular
            ? '0 4px 16px rgba(212,175,55,0.15)'
            : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {isMostPopular && (
        <div style={{
          position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
          background: '#d4af37', color: '#0a1929',
          padding: '4px 18px', borderRadius: '20px',
          fontSize: '11px', fontWeight: '800', letterSpacing: '0.8px', whiteSpace: 'nowrap',
        }}>
          MOST POPULAR
        </div>
      )}

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
      <div style={{ marginBottom: '28px', minHeight: '80px' }}>
        {plan.contact_sales ? (
          <>
            <div style={{ fontSize: '40px', fontWeight: '800', color: '#0a1929', lineHeight: 1 }}>Custom</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>For firms with 30+ advocates</div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {billingPeriod === 'annual' && plan.price_monthly_tzs && (
                <span style={{ fontSize: '16px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: '500' }}>
                  {formatTZS(plan.price_monthly_tzs)}
                </span>
              )}
              <span style={{ fontSize: '36px', fontWeight: '800', color: '#0a1929', lineHeight: 1 }}>
                {formatTZS(displayPrice)}
              </span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>/mo</span>
              {billingPeriod === 'annual' && (
                <span style={{
                  background: '#d1fae5', color: '#065f46',
                  fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '20px',
                }}>
                  SAVE 17%
                </span>
              )}
            </div>
            {billingPeriod === 'annual' && annualTotal && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Billed annually as {formatTZS(annualTotal)}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>VAT inclusive</div>
          </>
        )}
      </div>

      {/* Limits */}
      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px' }}>
        {[
          { label: 'Advocates', value: plan.max_users != null ? `Up to ${plan.max_users}` : 'Unlimited' },
          { label: 'KYC clients', value: plan.max_clients != null ? `Up to ${Number(plan.max_clients).toLocaleString()}` : 'Unlimited' },
          { label: 'Active matters', value: plan.max_matters != null ? `Up to ${Number(plan.max_matters).toLocaleString()}` : 'Unlimited' },
          { label: 'IRAs/year', value: plan.max_iras_per_year != null ? plan.max_iras_per_year : 'Unlimited' },
          { label: 'Screenings/month', value: plan.max_screenings_per_month != null ? Number(plan.max_screenings_per_month).toLocaleString() : 'Unlimited' },
          { label: 'Storage', value: plan.storage_gb != null ? `${plan.storage_gb} GB` : '500+ GB' },
        ].map(({ label, value }) => (
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
          background: cta.disabled
            ? '#e2e8f0'
            : isMostPopular
              ? 'linear-gradient(135deg, #d4af37, #b8941f)'
              : '#0a1929',
          color: cta.disabled ? '#94a3b8' : isMostPopular ? '#0a1929' : 'white',
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
