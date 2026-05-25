import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import BillingToggle from './BillingToggle';
import PlanCard from './PlanCard';
import FeatureComparisonTable from './FeatureComparisonTable';
import FAQAccordion from './FAQAccordion';
import ContactSalesModal from './ContactSalesModal';

const ADDON_CATEGORY_LABELS = {
  capacity: 'Capacity',
  feature: 'Features',
  service: 'Professional Services',
  integration: 'Integrations',
};

const PRICING_MODEL_LABELS = {
  monthly_recurring: '/month',
  annual_recurring: '/year',
  per_unit: '/unit',
  one_time: 'one-time',
};

function AddonsSection({ onContactSales }) {
  const [addons, setAddons] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    supabase
      .from('subscription_addons')
      .select('addon_code, name, description, category, pricing_model, price_tzs, unit_label, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => setAddons(data || []));
  }, []);

  if (addons.length === 0) return null;

  const grouped = addons.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <section style={{ marginBottom: '64px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          style={{
            padding: '14px 32px', borderRadius: '10px',
            border: '2px solid #0a1929', background: expanded ? '#0a1929' : 'white',
            color: expanded ? 'white' : '#0a1929',
            fontWeight: '700', fontSize: '15px', cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex', alignItems: 'center', gap: '10px',
          }}
        >
          {expanded ? 'Hide' : 'See optional add-ons & professional services'}
          <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', lineHeight: 1 }}>↓</span>
        </button>
      </div>

      {expanded && (
        <div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>
            Extend any plan with additional capacity, features, or professional services. All prices VAT-inclusive.
          </p>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                {ADDON_CATEGORY_LABELS[category] || category}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {items.map(addon => (
                  <div key={addon.addon_code} style={{
                    background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                    padding: '20px 22px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0a1929', lineHeight: 1.35 }}>{addon.name}</h4>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {addon.pricing_model === 'one_time' && addon.name.toLowerCase().includes('integration') ? (
                          <button type="button" onClick={onContactSales} style={{ background: 'none', border: 'none', color: '#d4af37', fontWeight: '700', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                            Contact sales
                          </button>
                        ) : (
                          <>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0a1929' }}>
                              TZS {Number(addon.price_tzs).toLocaleString('en-TZ')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                              {addon.unit_label || PRICING_MODEL_LABELS[addon.pricing_model]}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.55 }}>{addon.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const PAYMENT_METHODS = [
  { label: 'M-Pesa', color: '#00a651' },
  { label: 'Mixx by Yas', color: '#e4002b' },
  { label: 'Airtel Money', color: '#e40000' },
  { label: 'HaloPesa', color: '#f59e0b' },
  { label: 'CRDB Bank Transfer', color: '#005f9e' },
];

function trackEvent(name, data = {}) {
  // Log to console for now; wire to analytics later
  console.log('[pricing_event]', name, data);
}

export default function PricingPage() {
  const { user, profile, organization } = useAuth();
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('annual');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    document.title = 'Pricing — Iuris Peritis | AML Compliance for Tanzanian Advocates';
    trackEvent('pricing_page_viewed', { referrer: document.referrer });
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('subscription_plans')
      .select('tier, display_name, name, description, price_monthly_tzs, price_annual_tzs, max_users, max_clients, max_matters, max_iras_per_year, max_compliance_cases_per_year, max_screenings_per_month, storage_gb, max_branches, audit_log_retention_years, features, contact_sales, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (err) { setError(err.message); }
    else { setPlans(data || []); }
    setLoading(false);
  };

  const handleBillingToggle = (v) => {
    setBillingPeriod(v);
    trackEvent('billing_toggle_changed', { value: v });
  };

  const visiblePlans = plans.filter(p => p.tier !== 'trial');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Top nav */}
      <nav style={{
        background: '#0a1929', borderBottom: '1px solid rgba(212,175,55,0.2)',
        padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to={user ? '/' : '/auth'} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src="/ChatGPT_Image_May_25,_2026,_11_01_20_PM.png" alt="Iuris Compliance" style={{ height: '48px', width: 'auto', borderRadius: '6px' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <Link to="/" style={navLink}>Dashboard</Link>
          ) : (
            <Link to="/auth" style={navLink}>Sign in</Link>
          )}
          <Link to="/auth?plan=small_firm" style={{
            padding: '8px 20px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #d4af37, #b8941f)',
            color: '#0a1929', fontWeight: '700', fontSize: '14px', textDecoration: 'none',
          }}>
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #0a1929 0%, #0d2137 60%, #0a1929 100%)', padding: '80px 40px 72px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.3)', borderRadius: '20px',
            padding: '4px 16px', fontSize: '12px', fontWeight: '700',
            color: '#d4af37', letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '24px',
          }}>
            Built for AMLA Cap. 423
          </div>
          <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: '800', color: 'white', lineHeight: 1.15 }}>
            Pricing for Tanzanian Advocates
          </h1>
          <p style={{ margin: '0 0 36px', fontSize: 'clamp(16px, 2vw, 19px)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            Three compliance systems in one — Client KYC/CDD, Institutional Risk Assessment, and Sanctions Screening, built for AMLA Cap. 423.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
            {[
              '14-day free trial on all paid plans',
              'No credit card required',
              'Cancel anytime',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d4af37', fontSize: '15px', fontWeight: '600' }}>
                <span style={{ fontSize: '16px' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 24px 80px' }}>
        {/* Billing toggle */}
        <div style={{ marginBottom: '48px' }}>
          <BillingToggle value={billingPeriod} onChange={handleBillingToggle} />
        </div>

        {/* Plan cards */}
        {loading ? (
          <PlanCardSkeleton />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>Unable to load pricing. Please refresh or contact support.</p>
            <button onClick={loadPlans} style={ghostBtn}>Refresh</button>
          </div>
        ) : visiblePlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            Pricing is being updated. Please check back shortly or contact sales.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            marginBottom: '64px',
            alignItems: 'start',
          }}>
            {visiblePlans.map(plan => (
              <PlanCard
                key={plan.tier}
                plan={plan}
                billingPeriod={billingPeriod}
                user={user}
                profile={profile}
                organization={organization}
                onContactSales={() => { setShowContactModal(true); trackEvent('contact_sales_modal_opened', { tier: plan.tier }); }}
                onTrackEvent={trackEvent}
              />
            ))}
          </div>
        )}

        {/* Feature comparison */}
        <section style={{ marginBottom: '64px' }}>
          <FeatureComparisonTable onTrackEvent={trackEvent} />
        </section>

        {/* Add-ons */}
        <AddonsSection onContactSales={() => { setShowContactModal(true); trackEvent('contact_sales_modal_opened', { source: 'addons' }); }} />

        {/* Payment methods */}
        <section style={{ marginBottom: '64px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' }}>Payment methods we accept</h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px' }}>
            All prices in Tanzanian Shillings (TZS), VAT-inclusive at 18%. We issue a formal invoice on every payment.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
            {PAYMENT_METHODS.map(({ label, color }) => (
              <div key={label} style={{
                padding: '8px 18px', borderRadius: '8px',
                border: '1.5px solid #e2e8f0', background: 'white',
                fontSize: '13px', fontWeight: '700', color,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: '740px', margin: '0 auto 64px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0a1929', marginBottom: '8px', textAlign: 'center' }}>
            Frequently asked questions
          </h2>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '15px', marginBottom: '40px' }}>
            Still have questions? <button onClick={() => setShowContactModal(true)} style={{ background: 'none', border: 'none', color: '#d4af37', fontWeight: '700', cursor: 'pointer', fontSize: '15px', padding: 0 }}>Contact us</button>
          </p>
          <FAQAccordion onTrackEvent={trackEvent} />
        </section>

        {/* Footer CTA */}
        <section style={{
          background: 'linear-gradient(135deg, #0a1929, #0d2137)',
          borderRadius: '20px', padding: '56px 40px', textAlign: 'center',
          border: '1px solid rgba(212,175,55,0.2)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: '800', color: 'white' }}>Still have questions?</h2>
          <p style={{ margin: '0 0 32px', fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
            Our team is ready to help you get started with AMLA Cap. 423 compliance.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={() => { setShowContactModal(true); trackEvent('contact_sales_modal_opened', { source: 'footer_cta' }); }}
              style={{ padding: '14px 32px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #d4af37, #b8941f)', color: '#0a1929', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
            >
              Contact sales
            </button>
            <Link to={user ? '/' : '/auth'} style={{ padding: '14px 32px', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'white', fontWeight: '700', fontSize: '15px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              {user ? 'Go to dashboard' : 'Schedule a demo'}
            </Link>
          </div>
        </section>
      </div>

      {showContactModal && (
        <ContactSalesModal
          onClose={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
}

function PlanCardSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '64px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px 28px', height: '480px' }}>
          <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '24px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '16px', width: '70%', marginBottom: '32px' }} />
          <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '48px', marginBottom: '24px' }} />
          {[1, 2, 3, 4, 5].map(j => (
            <div key={j} style={{ background: '#f1f5f9', borderRadius: '6px', height: '14px', marginBottom: '10px', width: `${70 + j * 5}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const navLink = {
  color: 'rgba(255,255,255,0.8)', textDecoration: 'none',
  fontSize: '14px', fontWeight: '600',
};

const ghostBtn = {
  padding: '10px 24px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  background: 'white', color: '#0a1929', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
};
