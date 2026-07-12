import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ContactSalesModal from './pricing/ContactSalesModal';

const PLAN_DESCRIPTIONS = {
  small_firm: { tagline: 'For firms with up to 10 advocates', features: ['Up to 10 users', 'KYC/CDD + IRAs (4/yr)', 'Quarterly Maturity', 'WhatsApp & email support'] },
  medium_firm: { tagline: 'For firms with 11–30 advocates', features: ['Up to 30 users', 'Unlimited IRAs', 'Premium sanctions screening', 'Priority phone support'] },
};

const practiceAreaOptions = [
  'Corporate and commercial law',
  'Real estate and conveyancing',
  'Litigation and dispute resolution',
  'Banking and finance',
  'Tax and structuring',
  'Insolvency and restructuring',
  'Trust and private client services',
  'NGO and charity advisory',
  'Cross-border transactions',
  'Investment and mergers & acquisitions'
];

export default function LawFirmOnboarding({ organizationId, onComplete }) {
  const TOTAL_STEPS = 6;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showContactSales, setShowContactSales] = useState(false);
  const [planSuggestion, setPlanSuggestion] = useState(null);

  useEffect(() => {
    supabase
      .from('subscription_plans')
      .select('id, tier, name, display_name, price_monthly_tzs, trial_days, contact_sales, max_users')
      .in('tier', ['small_firm', 'medium_firm'])
      .order('price_monthly_tzs', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (data) {
          setPlans(data);
          setSelectedPlan(data[0] ?? null);
        }
      });
  }, []);

  const [formData, setFormData] = useState({
    number_of_advocates: '',
    practice_areas: [],
    serves_high_net_worth: false,
    serves_peps: false,
    serves_foreign_clients: false,
    serves_multinationals: false,
    serves_financial_institutions: false,
    serves_dnfbps: false,
    serves_ngos_foreign_funding: false,
    handles_client_funds: false,
    acts_as_company_secretary: false,
    assists_company_formation: false,
    assists_beneficial_ownership: false,
    provides_nominee_services: false,
    provides_tax_structuring: false,
    engages_cross_border_structuring: false,
    conducts_cross_border_work: false,
    engages_high_risk_jurisdictions: false,
    uses_foreign_intermediaries: false,
    works_with_offshore_structures: false
  });

  const togglePracticeArea = (area) => {
    setFormData(prev => ({
      ...prev,
      practice_areas: prev.practice_areas.includes(area)
        ? prev.practice_areas.filter(a => a !== area)
        : [...prev.practice_areas, area]
    }));
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNext = () => {
    if (step === 1 && !selectedPlan) {
      setError('Please select a plan to continue');
      return;
    }
    if (step === 1 && selectedPlan?.contact_sales) {
      setError('Please contact sales for the Large Firm plan.');
      return;
    }
    if (step === 2 && !formData.number_of_advocates) {
      setError('Please select firm size');
      return;
    }
    if (step === 2 && formData.number_of_advocates === '16+') {
      setShowContactSales(true);
      return;
    }
    if (step === 2 && formData.number_of_advocates && selectedPlan) {
      const isMediumRange = formData.number_of_advocates === '6-15';
      const isSmallRange = ['1', '2-5'].includes(formData.number_of_advocates);
      if (isSmallRange && selectedPlan.tier === 'medium_firm') {
        setPlanSuggestion({ suggestedTier: 'small_firm', reason: 'You selected 1–5 advocates. The Small Firm plan (TZS 250,000/mo) is a better fit.' });
        return;
      }
      if (isMediumRange && selectedPlan.tier === 'small_firm') {
        setPlanSuggestion({ suggestedTier: 'medium_firm', reason: 'You selected 6–15 advocates. The Medium Firm plan (TZS 600,000/mo) is the right fit.' });
        return;
      }
    }
    if (step === 3 && formData.practice_areas.length === 0) {
      setError('Please select at least one practice area');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setPlanSuggestion(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('law_firm_profiles')
        .insert({
          organization_id: organizationId,
          ...formData,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      if (selectedPlan && !selectedPlan.contact_sales) {
        const { error: trialError } = await supabase.rpc('start_trial', {
          p_org_id: organizationId,
          p_chosen_tier: selectedPlan.tier,
        });
        if (trialError) console.error('Trial start error (non-fatal):', trialError);
      }

      onComplete();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2 style={styles.title}>Complete Your Firm Profile</h2>
            <p style={styles.subtitle}>Estimated time: 5 minutes</p>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${(step / TOTAL_STEPS) * 100}%` }} />
            </div>
          </div>

          <div style={styles.content}>
            {step === 1 && (
              <div style={styles.step}>
                <h3 style={styles.stepTitle}>Step 1: Choose Your Plan</h3>
                <p style={styles.stepDescription}>Start with a free 14-day trial. No payment required upfront.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {plans.map(plan => {
                    const isSelected = selectedPlan?.id === plan.id;
                    const desc = PLAN_DESCRIPTIONS[plan.tier] || {};
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        style={{
                          padding: '16px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                          border: isSelected ? '2px solid #d4af37' : '2px solid #e2e8f0',
                          background: isSelected ? '#fffbeb' : '#f8fafc',
                          boxShadow: isSelected ? '0 0 0 2px rgba(212,175,55,0.2)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#0a1929', marginBottom: '4px' }}>
                          {plan.display_name || plan.name || plan.tier}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                          {desc.tagline || ''}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                          {plan.price_monthly_tzs ? `TZS ${Number(plan.price_monthly_tzs).toLocaleString()} / mo` : 'Free'}
                        </div>
                        {(desc.features || []).map(f => (
                          <div key={f} style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>• {f}</div>
                        ))}
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#166534' }}>
                  Your 14-day free trial begins when you complete this setup. No credit card required.
                </div>
                <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                  Firm with 16+ advocates?{' '}
                  <button
                    type="button"
                    onClick={() => setShowContactSales(true)}
                    style={{ background: 'none', border: 'none', color: '#d4af37', fontWeight: '700', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                  >
                    Contact us for Large Firm pricing
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={styles.step}>
                <h3 style={styles.stepTitle}>Step 2: Firm Size</h3>
                <p style={styles.stepDescription}>Number of Advocates and Professionals</p>

                <div style={styles.formGroup}>
                  <select
                    value={formData.number_of_advocates}
                    onChange={(e) => { setFormData({ ...formData, number_of_advocates: e.target.value }); setPlanSuggestion(null); }}
                    style={styles.select}
                  >
                    <option value="">Select number of advocates</option>
                    <option value="1">1 advocate</option>
                    <option value="2-5">2–5 advocates</option>
                    <option value="6-15">6–15 advocates</option>
                    <option value="16+">16+ advocates</option>
                  </select>
                </div>

                {planSuggestion && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '14px 16px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
                      {planSuggestion.reason}
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const suggested = plans.find(p => p.tier === planSuggestion.suggestedTier);
                          if (suggested) setSelectedPlan(suggested);
                          setPlanSuggestion(null);
                          setStep(step + 1);
                        }}
                        style={{ padding: '8px 18px', borderRadius: '6px', background: '#d4af37', border: 'none', fontWeight: '700', fontSize: '13px', color: '#0a1929', cursor: 'pointer' }}
                      >
                        Switch to {planSuggestion.suggestedTier === 'small_firm' ? 'Small Firm' : 'Medium Firm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPlanSuggestion(null); setStep(step + 1); }}
                        style={{ padding: '8px 18px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0', fontWeight: '600', fontSize: '13px', color: '#64748b', cursor: 'pointer' }}
                      >
                        Keep current plan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div style={styles.step}>
                <h3 style={styles.stepTitle}>Step 3: Practice Areas</h3>
                <p style={styles.stepDescription}>Select all that apply</p>

                <div style={styles.checkboxGrid}>
                  {practiceAreaOptions.map(area => (
                    <label key={area} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.practice_areas.includes(area)}
                        onChange={() => togglePracticeArea(area)}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>{area}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={styles.step}>
                <h3 style={styles.stepTitle}>Step 4: Client Profile</h3>
                <p style={styles.stepDescription}>Does the firm serve:</p>

                <div style={styles.checkboxList}>
                  {[
                    { field: 'serves_high_net_worth', label: 'High-net-worth individuals' },
                    { field: 'serves_peps', label: 'Politically exposed persons' },
                    { field: 'serves_foreign_clients', label: 'Foreign clients' },
                    { field: 'serves_multinationals', label: 'Multinational corporations' },
                    { field: 'serves_financial_institutions', label: 'Financial institutions' },
                    { field: 'serves_dnfbps', label: 'DNFBPs' },
                    { field: 'serves_ngos_foreign_funding', label: 'NGOs receiving foreign funding' }
                  ].map(item => (
                    <label key={item.field} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData[item.field]}
                        onChange={() => handleCheckboxChange(item.field)}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div style={styles.step}>
                <h3 style={styles.stepTitle}>Step 5: Risk Exposure</h3>
                <p style={styles.stepDescription}>Does the firm:</p>

                <div style={styles.checkboxList}>
                  {[
                    { field: 'handles_client_funds', label: 'Handle client funds or escrow accounts?' },
                    { field: 'acts_as_company_secretary', label: 'Act as company secretary or trustee?' },
                    { field: 'assists_company_formation', label: 'Assist in company formation?' },
                    { field: 'assists_beneficial_ownership', label: 'Assist in beneficial ownership structuring?' },
                    { field: 'provides_nominee_services', label: 'Provide nominee or intermediary services?' },
                    { field: 'provides_tax_structuring', label: 'Provide tax structuring?' },
                    { field: 'engages_cross_border_structuring', label: 'Engage in cross-border asset structuring?' }
                  ].map(item => (
                    <label key={item.field} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData[item.field]}
                        onChange={() => handleCheckboxChange(item.field)}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div style={styles.step}>
                <h3 style={styles.stepTitle}>Step 6: Geographic Exposure</h3>
                <p style={styles.stepDescription}>Does the firm:</p>

                <div style={styles.checkboxList}>
                  {[
                    { field: 'conducts_cross_border_work', label: 'Conduct cross-border work?' },
                    { field: 'engages_high_risk_jurisdictions', label: 'Engage with high-risk jurisdictions?' },
                    { field: 'uses_foreign_intermediaries', label: 'Use foreign intermediaries?' },
                    { field: 'works_with_offshore_structures', label: 'Work with offshore structures?' }
                  ].map(item => (
                    <label key={item.field} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData[item.field]}
                        onChange={() => handleCheckboxChange(item.field)}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && !planSuggestion && <div style={styles.error}>{error}</div>}
          </div>

          <div style={styles.footer}>
            {step > 1 && (
              <button onClick={handleBack} style={styles.buttonSecondary} disabled={loading}>
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < TOTAL_STEPS ? (
              <button onClick={handleNext} style={styles.buttonPrimary} disabled={loading}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} style={styles.buttonPrimary} disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showContactSales && (
        <ContactSalesModal onClose={() => setShowContactSales(false)} />
      )}
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  header: {
    padding: '32px 32px 24px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0'
  },
  progressBar: {
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    transition: 'width 0.3s ease'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px'
  },
  step: {
    animation: 'fadeIn 0.3s ease'
  },
  stepTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  stepDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0'
  },
  formGroup: {
    marginBottom: '16px'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer'
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px'
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxText: {
    fontSize: '14px',
    color: '#334155',
    flex: 1
  },
  error: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px'
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '24px 32px',
    borderTop: '1px solid #e2e8f0'
  },
  buttonSecondary: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  buttonPrimary: {
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#0ea5e9',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
