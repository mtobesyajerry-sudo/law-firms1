import React, { useState } from 'react';
import supabase from '../supabaseClient';

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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (step === 1 && !formData.number_of_advocates) {
      setError('Please select firm size');
      return;
    }
    if (step === 2 && formData.practice_areas.length === 0) {
      setError('Please select at least one practice area');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
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

      onComplete();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Complete Your Firm Profile</h2>
          <p style={styles.subtitle}>Estimated time: 5 minutes</p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${(step / 5) * 100}%` }} />
          </div>
        </div>

        <div style={styles.content}>
          {step === 1 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Step 1: Firm Size</h3>
              <p style={styles.stepDescription}>Number of Advocates and Professionals</p>

              <div style={styles.formGroup}>
                <select
                  value={formData.number_of_advocates}
                  onChange={(e) => setFormData({ ...formData, number_of_advocates: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Select firm size</option>
                  <option value="1-3">1–3</option>
                  <option value="4-10">4–10</option>
                  <option value="11-25">11–25</option>
                  <option value="26-50">26–50</option>
                  <option value="More than 50">More than 50</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Step 2: Practice Areas</h3>
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

          {step === 3 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Step 3: Client Profile</h3>
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

          {step === 4 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Step 4: Risk Exposure</h3>
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

          {step === 5 && (
            <div style={styles.step}>
              <h3 style={styles.stepTitle}>Step 5: Geographic Exposure</h3>
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

          {error && <div style={styles.error}>{error}</div>}
        </div>

        <div style={styles.footer}>
          {step > 1 && (
            <button onClick={handleBack} style={styles.buttonSecondary} disabled={loading}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 5 ? (
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
