import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { accountantKycSections } from '../data/accountantKycData';
import { calculateAccountantKycRisk } from '../utils/accountantKycRiskCalculator';
import { isKycComplete } from '../utils/kycCompleteness';

export default function AccountantKycForm() {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !profile) {
        navigate('/client/dashboard');
        return;
      }

      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .maybeSingle();

        if (orgError) throw orgError;

        if (!orgData || orgData.sector !== 'accounting') {
          navigate('/client/dashboard');
          return;
        }

        setOrganization(orgData);
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/client/dashboard');
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, profile, navigate]);

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const renderField = (field) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'date':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={styles.input}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={{...styles.input, minHeight: field.rows ? `${field.rows * 24}px` : '80px'}}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            style={styles.input}
            required={field.required}
          >
            <option value="">Select...</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div style={styles.radioGroup}>
            {field.options.map(option => (
              <label key={option} style={styles.radioLabel}>
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  style={styles.radio}
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              required={field.required}
              style={styles.checkbox}
            />
            {field.label}
          </label>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentSection < accountantKycSections.length - 1) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Calculate risk assessment
      const riskAssessment = calculateAccountantKycRisk(formData);

      // Determine client type
      const clientType = formData.legal_name ? 'corporate' : 'individual';

      // Extract contact information
      const email = formData.email_address || '';
      const phone = formData.telephone_number || '';

      // Extract address
      const address = formData.residential_address || formData.registered_address || '';

      // Extract identification
      const idNumber = formData.id_number || formData.registration_number || '';

      // Extract nationality/country
      const country = formData.nationality || formData.country_of_incorporation || '';

      // Determine review frequency based on risk level
      const getReviewFrequency = (riskLevel) => {
        if (riskLevel === 'Very High Risk') return 'monthly';
        if (riskLevel === 'High Risk') return 'quarterly';
        if (riskLevel === 'Medium Risk') return 'semi_annual';
        return 'annual';
      };

      // Determine completeness and DD level
      const { complete: kycComplete } = isKycComplete({
        riskFactors: { service: riskAssessment.riskBreakdown },
        sourceOfFunds: formData.source_of_funds || '',
        amlTriggers: ['none_apply'],
        clientType,
      });

      const ddFloor = riskAssessment.riskLevel === 'Very High Risk' || riskAssessment.riskLevel === 'High Risk'
        ? 'enhanced'
        : 'standard';

      // Build metadata without PII fields — those go into *_plain columns for encryption
      const { full_name, legal_name, telephone_number, residential_address,
              registered_address, id_number, registration_number: _reg, ...safeMetadata } = formData;

      const kycRecord = {
        organization_id: organization.id,
        client_name_plain: formData.full_name || formData.legal_name || '',
        client_type: clientType,
        national_id_plain: idNumber || null,
        email: email,
        phone_plain: phone || null,
        address_plain: address || null,
        nationality: country,
        client_status: kycComplete ? 'active' : 'prospect',
        onboarding_status: kycComplete ? 'completed' : 'pending',
        current_dd_level: ddFloor,
        base_risk_score: riskAssessment.totalScore,
        current_risk_rating: riskAssessment.riskLevel.replace(' Risk', ''),
        edd_required: riskAssessment.riskLevel === 'High Risk' || riskAssessment.riskLevel === 'Very High Risk',
        review_frequency: getReviewFrequency(riskAssessment.riskLevel),
        customer_data: safeMetadata,
        created_by: user.id,
        relationship_manager_id: user.id,
        created_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('kyc_clients')
        .insert([kycRecord])
        .select()
        .single();

      if (insertError) throw insertError;

      alert('KYC/CDD record saved as draft successfully!');
      navigate(`/accountant-kyc-report/${data.id}`);
    } catch (err) {
      console.error('Error saving KYC record:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div style={styles.container}>
        <div style={{textAlign: 'center', padding: '48px 0', color: '#718096'}}>
          Loading...
        </div>
      </div>
    );
  }

  const section = accountantKycSections[currentSection];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>KYC/CDD Questionnaire for Accountants & Auditors</h1>
        <p style={styles.subtitle}>
          Aligned with NBAA AML Guidelines 2025, AML Act, and AML Regulations 2022
        </p>
      </div>

      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${((currentSection + 1) / accountantKycSections.length) * 100}%`
          }}
        />
      </div>
      <p style={styles.progressText}>
        Section {currentSection + 1} of {accountantKycSections.length}
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{section.title}</h2>
          {section.description && (
            <p style={styles.sectionDescription}>{section.description}</p>
          )}

          {section.subsections.map((subsection) => (
            <div key={subsection.id} style={styles.subsection}>
              <h3 style={styles.subsectionTitle}>{subsection.title}</h3>
              {subsection.description && (
                <p style={styles.subsectionDescription}>{subsection.description}</p>
              )}

              {subsection.fields.map((field) => (
                <div key={field.id} style={styles.fieldGroup}>
                  {field.type !== 'checkbox' && (
                    <label style={styles.label}>
                      {field.label}
                      {field.required && <span style={styles.required}> *</span>}
                    </label>
                  )}
                  {renderField(field)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.navigation}>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentSection === 0}
            style={{
              ...styles.button,
              ...styles.secondaryButton,
              ...(currentSection === 0 ? styles.buttonDisabled : {})
            }}
          >
            Previous
          </button>

          {currentSection < accountantKycSections.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{...styles.button, ...styles.primaryButton}}
            >
              Next Section
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(loading ? styles.buttonDisabled : {})
              }}
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
          )}
        </div>
      </form>

      <button
        onClick={() => navigate('/dashboard')}
        style={styles.backButton}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px'
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.5'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4299e1',
    transition: 'width 0.3s ease'
  },
  progressText: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#718096',
    marginBottom: '32px'
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px'
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  subsection: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e2e8f0'
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px'
  },
  subsectionDescription: {
    fontSize: '13px',
    color: '#718096',
    marginBottom: '16px',
    fontStyle: 'italic'
  },
  fieldGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#2d3748',
    marginBottom: '8px'
  },
  required: {
    color: '#e53e3e'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#2d3748',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#2d3748',
    cursor: 'pointer'
  },
  radio: {
    marginRight: '8px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '14px',
    color: '#2d3748',
    cursor: 'pointer'
  },
  checkbox: {
    marginRight: '8px',
    marginTop: '2px',
    cursor: 'pointer'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '32px',
    gap: '16px'
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  primaryButton: {
    backgroundColor: '#4299e1',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    color: '#2d3748'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  backButton: {
    marginTop: '24px',
    padding: '10px 20px',
    fontSize: '14px',
    color: '#4299e1',
    backgroundColor: 'transparent',
    border: '1px solid #4299e1',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'block',
    margin: '24px auto 0'
  },
  error: {
    padding: '12px',
    backgroundColor: '#fed7d7',
    color: '#9b2c2c',
    borderRadius: '6px',
    marginTop: '16px',
    fontSize: '14px'
  }
};
