import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const PRACTICE_AREAS = [
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

const LawFirmOnboardingWizard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState(null);

  const [formData, setFormData] = useState({
    firmSize: '4-10',
    numberOfAdvocates: 0,
    practiceAreas: [],
    servesHnwi: false,
    servesPeps: false,
    servesForeignClients: false,
    servesMultinationals: false,
    servesFinancialInstitutions: false,
    servesDnfbps: false,
    servesNgosForeignFunding: false,
    handlesClientFunds: false,
    actsAsCompanySecretary: false,
    assistsCompanyFormation: false,
    assistsBeneficialOwnership: false,
    providesNomineeServices: false,
    providesTaxStructuring: false,
    engagesCrossBorderStructuring: false,
    conductsCrossBorderWork: false,
    engagesHighRiskJurisdictions: false,
    usesForeignIntermediaries: false,
    worksWithOffshoreStructures: false
  });

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const { data: progress, error: progressError } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (progressError) throw progressError;

      if (progress) {
        if (progress.all_steps_completed) {
          navigate('/client/dashboard');
          return;
        }
        setCurrentStep(progress.current_step);
      }

      const { data: firmProfile, error: profileError } = await supabase
        .from('law_firm_profiles')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (firmProfile) {
        setProfileId(firmProfile.id);
        setFormData({
          firmSize: firmProfile.firm_size || '4-10',
          numberOfAdvocates: firmProfile.number_of_advocates || 0,
          practiceAreas: firmProfile.practice_areas || [],
          servesHnwi: firmProfile.serves_hnwi || false,
          servesPeps: firmProfile.serves_peps || false,
          servesForeignClients: firmProfile.serves_foreign_clients || false,
          servesMultinationals: firmProfile.serves_multinationals || false,
          servesFinancialInstitutions: firmProfile.serves_financial_institutions || false,
          servesDnfbps: firmProfile.serves_dnfbps || false,
          servesNgosForeignFunding: firmProfile.serves_ngos_foreign_funding || false,
          handlesClientFunds: firmProfile.handles_client_funds || false,
          actsAsCompanySecretary: firmProfile.acts_as_company_secretary || false,
          assistsCompanyFormation: firmProfile.assists_company_formation || false,
          assistsBeneficialOwnership: firmProfile.assists_beneficial_ownership || false,
          providesNomineeServices: firmProfile.provides_nominee_services || false,
          providesTaxStructuring: firmProfile.provides_tax_structuring || false,
          engagesCrossBorderStructuring: firmProfile.engages_cross_border_structuring || false,
          conductsCrossBorderWork: firmProfile.conducts_cross_border_work || false,
          engagesHighRiskJurisdictions: firmProfile.engages_high_risk_jurisdictions || false,
          usesForeignIntermediaries: firmProfile.uses_foreign_intermediaries || false,
          worksWithOffshoreStructures: firmProfile.works_with_offshore_structures || false
        });
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    }
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePracticeAreaToggle = (area) => {
    setFormData(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area]
    }));
  };

  const saveStep = async (stepNumber) => {
    setLoading(true);
    setError('');

    try {
      const updateData = {
        firm_size: formData.firmSize,
        number_of_advocates: parseInt(formData.numberOfAdvocates) || 0,
        practice_areas: formData.practiceAreas,
        serves_hnwi: formData.servesHnwi,
        serves_peps: formData.servesPeps,
        serves_foreign_clients: formData.servesForeignClients,
        serves_multinationals: formData.servesMultinationals,
        serves_financial_institutions: formData.servesFinancialInstitutions,
        serves_dnfbps: formData.servesDnfbps,
        serves_ngos_foreign_funding: formData.servesNgosForeignFunding,
        handles_client_funds: formData.handlesClientFunds,
        acts_as_company_secretary: formData.actsAsCompanySecretary,
        assists_company_formation: formData.assistsCompanyFormation,
        assists_beneficial_ownership: formData.assistsBeneficialOwnership,
        provides_nominee_services: formData.providesNomineeServices,
        provides_tax_structuring: formData.providesTaxStructuring,
        engages_cross_border_structuring: formData.engagesCrossBorderStructuring,
        conducts_cross_border_work: formData.conductsCrossBorderWork,
        engages_high_risk_jurisdictions: formData.engagesHighRiskJurisdictions,
        uses_foreign_intermediaries: formData.usesForeignIntermediaries,
        works_with_offshore_structures: formData.worksWithOffshoreStructures,
        updated_at: new Date().toISOString()
      };

      if (profileId) {
        const { error: updateError } = await supabase
          .from('law_firm_profiles')
          .update(updateData)
          .eq('id', profileId);

        if (updateError) throw updateError;
      } else {
        const { data: registration } = await supabase
          .from('law_firm_registrations')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: newProfile, error: insertError } = await supabase
          .from('law_firm_profiles')
          .insert([{
            organization_id: profile?.organization_id,
            registration_id: registration?.id,
            ...updateData
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setProfileId(newProfile.id);
      }

      const progressUpdate = {
        [`step_${stepNumber}_completed`]: true,
        current_step: stepNumber + 1,
        updated_at: new Date().toISOString()
      };

      const { error: progressError } = await supabase
        .from('onboarding_progress')
        .update(progressUpdate)
        .eq('user_id', user.id);

      if (progressError) throw progressError;

    } catch (err) {
      console.error('Error saving step:', err);
      setError('Failed to save progress. Please try again.');
      setLoading(false);
      return false;
    }

    setLoading(false);
    return true;
  };

  const handleNext = async () => {
    const saved = await saveStep(currentStep);
    if (saved) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      await saveStep(5);

      const { error: completeError } = await supabase
        .from('law_firm_profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (completeError) throw completeError;

      const { error: progressCompleteError } = await supabase
        .from('onboarding_progress')
        .update({
          all_steps_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (progressCompleteError) throw progressCompleteError;

      navigate('/client/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Step 1: Firm Size</h2>
      <p style={styles.stepDescription}>
        Tell us about the size of your law firm
      </p>

      <div style={styles.formGroup}>
        <label style={styles.label}>Number of Advocates and Professionals</label>
        <select
          value={formData.firmSize}
          onChange={(e) => setFormData(prev => ({ ...prev, firmSize: e.target.value }))}
          style={styles.select}
        >
          <option value="1-3">1–3</option>
          <option value="4-10">4–10</option>
          <option value="11-25">11–25</option>
          <option value="26-50">26–50</option>
          <option value="50+">More than 50</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Exact Number (Optional)</label>
        <input
          type="number"
          value={formData.numberOfAdvocates}
          onChange={(e) => setFormData(prev => ({ ...prev, numberOfAdvocates: e.target.value }))}
          style={styles.input}
          min="0"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Step 2: Practice Areas</h2>
      <p style={styles.stepDescription}>
        Select all practice areas that apply to your firm
      </p>

      <div style={styles.checkboxGrid}>
        {PRACTICE_AREAS.map(area => (
          <label key={area} style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.practiceAreas.includes(area)}
              onChange={() => handlePracticeAreaToggle(area)}
              style={styles.checkbox}
            />
            <span>{area}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Step 3: Client Profile</h2>
      <p style={styles.stepDescription}>
        What types of clients does your firm serve?
      </p>

      <div style={styles.checkboxList}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesHnwi}
            onChange={() => handleCheckboxChange('servesHnwi')}
            style={styles.checkbox}
          />
          <span>High-net-worth individuals</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesPeps}
            onChange={() => handleCheckboxChange('servesPeps')}
            style={styles.checkbox}
          />
          <span>Politically exposed persons (PEPs)</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesForeignClients}
            onChange={() => handleCheckboxChange('servesForeignClients')}
            style={styles.checkbox}
          />
          <span>Foreign clients</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesMultinationals}
            onChange={() => handleCheckboxChange('servesMultinationals')}
            style={styles.checkbox}
          />
          <span>Multinational corporations</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesFinancialInstitutions}
            onChange={() => handleCheckboxChange('servesFinancialInstitutions')}
            style={styles.checkbox}
          />
          <span>Financial institutions</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesDnfbps}
            onChange={() => handleCheckboxChange('servesDnfbps')}
            style={styles.checkbox}
          />
          <span>DNFBPs (Designated Non-Financial Businesses and Professions)</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.servesNgosForeignFunding}
            onChange={() => handleCheckboxChange('servesNgosForeignFunding')}
            style={styles.checkbox}
          />
          <span>NGOs receiving foreign funding</span>
        </label>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Step 4: Risk Exposure</h2>
      <p style={styles.stepDescription}>
        What services does your firm provide?
      </p>

      <div style={styles.checkboxList}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.handlesClientFunds}
            onChange={() => handleCheckboxChange('handlesClientFunds')}
            style={styles.checkbox}
          />
          <span>Handle client funds or escrow accounts</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.actsAsCompanySecretary}
            onChange={() => handleCheckboxChange('actsAsCompanySecretary')}
            style={styles.checkbox}
          />
          <span>Act as company secretary or trustee</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.assistsCompanyFormation}
            onChange={() => handleCheckboxChange('assistsCompanyFormation')}
            style={styles.checkbox}
          />
          <span>Assist in company formation</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.assistsBeneficialOwnership}
            onChange={() => handleCheckboxChange('assistsBeneficialOwnership')}
            style={styles.checkbox}
          />
          <span>Assist in beneficial ownership structuring</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.providesNomineeServices}
            onChange={() => handleCheckboxChange('providesNomineeServices')}
            style={styles.checkbox}
          />
          <span>Provide nominee or intermediary services</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.providesTaxStructuring}
            onChange={() => handleCheckboxChange('providesTaxStructuring')}
            style={styles.checkbox}
          />
          <span>Provide tax structuring</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.engagesCrossBorderStructuring}
            onChange={() => handleCheckboxChange('engagesCrossBorderStructuring')}
            style={styles.checkbox}
          />
          <span>Engage in cross-border asset structuring</span>
        </label>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Step 5: Geographic Exposure</h2>
      <p style={styles.stepDescription}>
        Does your firm engage in international activities?
      </p>

      <div style={styles.checkboxList}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.conductsCrossBorderWork}
            onChange={() => handleCheckboxChange('conductsCrossBorderWork')}
            style={styles.checkbox}
          />
          <span>Conduct cross-border work</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.engagesHighRiskJurisdictions}
            onChange={() => handleCheckboxChange('engagesHighRiskJurisdictions')}
            style={styles.checkbox}
          />
          <span>Engage with high-risk jurisdictions</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.usesForeignIntermediaries}
            onChange={() => handleCheckboxChange('usesForeignIntermediaries')}
            style={styles.checkbox}
          />
          <span>Use foreign intermediaries</span>
        </label>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.worksWithOffshoreStructures}
            onChange={() => handleCheckboxChange('worksWithOffshoreStructures')}
            style={styles.checkbox}
          />
          <span>Work with offshore structures</span>
        </label>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Firm Profile Setup</h1>
          <p style={styles.subtitle}>
            Complete your firm profile to activate appropriate compliance modules
          </p>
          <p style={styles.timeEstimate}>Estimated time: 5 minutes</p>
        </div>

        <div style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map(step => (
            <div
              key={step}
              style={{
                ...styles.progressStep,
                ...(step <= currentStep ? styles.progressStepActive : {})
              }}
            >
              {step}
            </div>
          ))}
        </div>

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              disabled={loading}
              style={styles.backButton}
            >
              Back
            </button>
          )}

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              style={styles.nextButton}
            >
              {loading ? 'Saving...' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              style={styles.completeButton}
            >
              {loading ? 'Completing...' : 'Complete Setup'}
            </button>
          )}
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Your firm profile has been configured. Modules will be activated based on your practice risk profile.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 50%, #0d1f33 100%)',
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    maxWidth: '900px',
    width: '100%',
    padding: '40px',
    border: '2px solid #d4af37'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#4a5568',
    margin: '0 0 8px 0'
  },
  timeEstimate: {
    fontSize: '14px',
    color: '#718096',
    fontStyle: 'italic',
    margin: 0
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '32px',
    gap: '8px'
  },
  progressStep: {
    flex: 1,
    height: '4px',
    background: '#e2e8f0',
    borderRadius: '2px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8'
  },
  progressStepActive: {
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)'
  },
  stepContent: {
    marginBottom: '32px'
  },
  stepTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e3a8a',
    margin: '0 0 12px 0'
  },
  stepDescription: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 24px 0'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '14px',
    color: '#0a1929',
    cursor: 'pointer',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'background 0.2s ease'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0
  },
  error: {
    padding: '12px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #ef4444',
    marginBottom: '20px'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginTop: '32px'
  },
  backButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b',
    background: 'white',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  nextButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    marginLeft: 'auto'
  },
  completeButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
    marginLeft: 'auto'
  },
  footer: {
    marginTop: '24px',
    padding: '16px',
    background: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #86efac'
  },
  footerText: {
    margin: 0,
    fontSize: '14px',
    color: '#166534',
    textAlign: 'center'
  }
};

export default LawFirmOnboardingWizard;
