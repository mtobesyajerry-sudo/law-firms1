import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { institutionCategories, employeeRanges, turnoverRanges } from '../data/assessmentData';

export default function AssessmentIntroduction({ assessment, organization, onComplete }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isEntityCategoryLocked = assessment?.entity_category ? true : false;

  const navigateToDashboard = () => {
    if (!profile?.role) {
      navigate('/client/dashboard');
      return;
    }
    switch (profile.role) {
      case 'staff':
      case 'lawyer':
        navigate('/dashboard/staff');
        break;
      case 'management':
      case 'senior_partner':
      case 'partner':
        navigate('/dashboard/management');
        break;
      case 'compliance_officer':
      case 'mlro':
        navigate('/dashboard/compliance');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/client/dashboard');
    }
  };

  const initialEntityCategory = assessment?.entity_category || '';

  const [formData, setFormData] = useState({
    framework_type: 'banks_financial_institutions',
    entity_category: initialEntityCategory,
    contact_person: assessment?.contact_person || '',
    contact_position: assessment?.contact_position || '',
    contact_email: assessment?.contact_email || '',
    contact_phone: assessment?.contact_phone || '',
    business_description: assessment?.business_description || '',
    number_of_employees: assessment?.number_of_employees || '',
    annual_turnover: assessment?.annual_turnover || '',
    geographical_presence: assessment?.geographical_presence || ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.entity_category) {
      newErrors.entity_category = 'Please select an institution category';
    }
    if (!formData.contact_person) {
      newErrors.contact_person = 'Contact person name is required';
    }
    if (!formData.contact_position) {
      newErrors.contact_position = 'Contact position is required';
    }
    if (!formData.contact_email) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email address';
    }
    if (!formData.business_description) {
      newErrors.business_description = 'Overview of legal services is required';
    }
    if (!formData.number_of_employees) {
      newErrors.number_of_employees = 'Please select number of employees';
    }
    if (!formData.annual_turnover) {
      newErrors.annual_turnover = 'Please select annual turnover range';
    }
    if (!formData.geographical_presence) {
      newErrors.geographical_presence = 'Geographical presence is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onComplete(formData);
    }
  };

  return (
    <>
      <style>
        {`
          .back-button-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.12);
            border-color: #a0aec0;
          }
          .submit-button-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(212, 175, 55, 0.45);
            background: linear-gradient(135deg, #e5c158 0%, #f5d96b 100%);
          }
          .input-field:hover {
            border-color: #cbd5e0;
          }
          .input-field:focus {
            border-color: #d4af37;
            box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Financial Institution Risk Assessment</h1>
              <h2 style={styles.subtitle}>{organization?.name}</h2>
              <p style={styles.description}>
                Please provide the following information to begin your financial institution risk assessment.
                This information helps us categorize your institution and provide an accurate AML/CFT/CPF risk assessment.
              </p>
            </div>
            <button onClick={navigateToDashboard} style={styles.backButtonHeader} className="back-button-hover">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Institution Classification</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Institution Type <span style={styles.required}>*</span>
              </label>
              {isEntityCategoryLocked ? (
                <div style={styles.categoryBadge}>
                  {institutionCategories.find(cat => cat.value === formData.entity_category)?.label || formData.entity_category}
                </div>
              ) : (
                <>
                  <select
                    value={formData.entity_category}
                    onChange={(e) => handleChange('entity_category', e.target.value)}
                    className="input-field"
                    style={{
                      ...styles.select,
                      ...(errors.entity_category ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select Institution Type</option>
                    {institutionCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {errors.entity_category && (
                    <span style={styles.errorText}>{errors.entity_category}</span>
                  )}
                </>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Overview of Legal Services <span style={styles.required}>*</span>
              </label>
              <textarea
                value={formData.business_description}
                onChange={(e) => handleChange('business_description', e.target.value)}
                placeholder="Briefly describe your main legal services, practice areas, customer segments, and areas of operation. This will appear in the report's Introduction section."
                className="input-field"
                style={{
                  ...styles.textarea,
                  ...(errors.business_description ? styles.inputError : {})
                }}
                rows={4}
              />
              {errors.business_description && (
                <span style={styles.errorText}>{errors.business_description}</span>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Contact Information</h3>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Contact Person <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                  placeholder="Full name"
                  className="input-field"
                  style={{
                    ...styles.input,
                    ...(errors.contact_person ? styles.inputError : {})
                  }}
                />
                {errors.contact_person && (
                  <span style={styles.errorText}>{errors.contact_person}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Position/Title <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_position}
                  onChange={(e) => handleChange('contact_position', e.target.value)}
                  placeholder="e.g., AML Compliance Officer, MLRO, Chief Risk Officer"
                  className="input-field"
                  style={{
                    ...styles.input,
                    ...(errors.contact_position ? styles.inputError : {})
                  }}
                />
                {errors.contact_position && (
                  <span style={styles.errorText}>{errors.contact_position}</span>
                )}
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="email@example.com"
                  className="input-field"
                  style={{
                    ...styles.input,
                    ...(errors.contact_email ? styles.inputError : {})
                  }}
                />
                {errors.contact_email && (
                  <span style={styles.errorText}>{errors.contact_email}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+255 XXX XXX XXX"
                  className="input-field"
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Institution Profile</h3>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Number of Employees <span style={styles.required}>*</span>
                </label>
                <select
                  value={formData.number_of_employees}
                  onChange={(e) => handleChange('number_of_employees', e.target.value)}
                  className="input-field"
                  style={{
                    ...styles.select,
                    ...(errors.number_of_employees ? styles.inputError : {})
                  }}
                >
                  <option value="">Select range</option>
                  {employeeRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
                {errors.number_of_employees && (
                  <span style={styles.errorText}>{errors.number_of_employees}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Approximate Annual Turnover <span style={styles.required}>*</span>
                </label>
                <select
                  value={formData.annual_turnover}
                  onChange={(e) => handleChange('annual_turnover', e.target.value)}
                  className="input-field"
                  style={{
                    ...styles.select,
                    ...(errors.annual_turnover ? styles.inputError : {})
                  }}
                >
                  <option value="">Select range</option>
                  {turnoverRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
                {errors.annual_turnover && (
                  <span style={styles.errorText}>{errors.annual_turnover}</span>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Geographical Presence <span style={styles.required}>*</span>
              </label>
              <textarea
                value={formData.geographical_presence}
                onChange={(e) => handleChange('geographical_presence', e.target.value)}
                placeholder="List branches, regions, cities, or jurisdictions where your institution operates"
                className="input-field"
                style={{
                  ...styles.textarea,
                  ...(errors.geographical_presence ? styles.inputError : {})
                }}
                rows={3}
              />
              {errors.geographical_presence && (
                <span style={styles.errorText}>{errors.geographical_presence}</span>
              )}
            </div>
          </div>

          <div style={styles.footer}>
            <button type="submit" style={styles.submitButton} className="submit-button-hover">
              Begin Assessment
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '8px'}}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    padding: '40px 20px',
  },
  content: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
    padding: '56px 48px',
    borderRadius: '20px',
    marginBottom: '32px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
    textAlign: 'justify',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '38px',
    fontWeight: '700',
    color: '#1a202c',
    letterSpacing: '-0.8px',
    textAlign: 'justify',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '28px',
    fontWeight: '600',
    color: '#d4af37',
    textAlign: 'justify',
  },
  description: {
    margin: 0,
    fontSize: '16px',
    color: '#4a5568',
    lineHeight: '1.8',
    textAlign: 'justify',
  },
  form: {
    background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
    padding: '48px',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid rgba(212, 175, 55, 0.12)',
  },
  section: {
    marginBottom: '48px',
    paddingBottom: '48px',
    borderBottom: '2px solid rgba(212, 175, 55, 0.15)',
  },
  sectionTitle: {
    margin: '0 0 32px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c',
    letterSpacing: '-0.5px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    marginBottom: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
    letterSpacing: '0.2px',
  },
  required: {
    color: '#e53e3e',
    marginLeft: '2px',
  },
  input: {
    padding: '16px 18px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
    outline: 'none',
    fontWeight: '500',
  },
  select: {
    padding: '16px 18px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontWeight: '500',
  },
  textarea: {
    padding: '16px 18px',
    fontSize: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontFamily: 'inherit',
    resize: 'vertical',
    transition: 'all 0.2s ease',
    backgroundColor: '#ffffff',
    outline: 'none',
    lineHeight: '1.7',
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#fc8181',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: '13px',
    color: '#e53e3e',
    fontWeight: '500',
  },
  categoryBadge: {
    padding: '16px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a202c',
    background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
    borderRadius: '12px',
    display: 'inline-block',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '2px solid #cbd5e0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: '40px',
    borderTop: '2px solid rgba(212, 175, 55, 0.12)',
    marginTop: '8px',
  },
  backButtonHeader: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    background: 'transparent',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '0.2px',
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: '32px',
    marginBottom: '24px',
  },
  submitButton: {
    padding: '16px 40px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
    transition: 'all 0.3s ease',
    letterSpacing: '0.3px',
    display: 'inline-flex',
    alignItems: 'center',
  },
};
