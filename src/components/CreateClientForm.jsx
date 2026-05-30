import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  contentCard,
  primaryButton
} from '../utils/designSystem';

/**
 * DEPRECATED FOR ACCOUNTANTS & INSURERS
 *
 * For Accountants/Auditors: Use AccountantKycForm instead (/accountant-kyc-form)
 * For Insurers: Use KycCddForm instead (/kyc-form)
 *
 * This simplified form is only for frameworks that don't require comprehensive KYC/CDD assessments.
 */
export default function CreateClientForm({ onClose, onSuccess, frameworkType }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    client_type: 'individual',
    client_name: '',
    client_id_number: '',
    date_of_birth: '',
    nationality: '',
    country_of_residence: '',
    email: '',
    phone_number: '',
    physical_address: '',
    mailing_address: '',

    // Corporate specific
    business_activity: '',
    industry_sector: '',
    registration_number: '',
    registration_country: '',

    // Financial Profile
    source_of_funds: '',
    source_of_wealth: '',
    estimated_annual_income: '',
    estimated_net_worth: '',
    purpose_of_relationship: '',
    expected_transaction_volume: '',
    expected_transaction_frequency: '',

    // Risk factors
    pep_status: false,
    pep_details: '',
    sanctioned_entity: false,
    adverse_media: false,

    // Insurance specific
    policy_type: '',
    premium_amount: '',
    premium_frequency: '',
    beneficiary_name: '',
    beneficiary_relationship: '',

    // Accounting specific
    service_type: [],
    engagement_purpose: '',
    complex_ownership: false,

    // Documents
    id_document_type: '',
    id_document_number: '',
    id_issuing_authority: '',
    id_issue_date: '',
    id_expiry_date: ''
  });

  const isInsurer = frameworkType === 'insurer';
  const isAccountant = frameworkType === 'accountant' || frameworkType === 'audit_firm';

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Calculate risk score
      const riskScore = calculateRiskScore();
      const riskRating = getRiskRating(riskScore);
      const ddLevel = getDDLevel(riskRating);

      const clientData = {
        organization_id: profile.organization_id,
        created_by: profile.id,
        relationship_manager_id: profile.id,
        client_type: formData.client_type,
        client_name: formData.client_name,
        client_id_number: formData.client_id_number,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality,
        country_of_residence: formData.country_of_residence,
        email: formData.email,
        phone_number: formData.phone_number,
        physical_address: formData.physical_address,
        mailing_address: formData.mailing_address,
        business_activity: formData.business_activity,
        industry_sector: formData.industry_sector,
        registration_number: formData.registration_number,
        registration_country: formData.registration_country,
        source_of_funds: formData.source_of_funds,
        source_of_wealth: formData.source_of_wealth,
        estimated_annual_income: formData.estimated_annual_income || null,
        estimated_net_worth: formData.estimated_net_worth || null,
        purpose_of_relationship: formData.purpose_of_relationship,
        expected_transaction_volume: formData.expected_transaction_volume || null,
        expected_transaction_frequency: formData.expected_transaction_frequency,
        pep_status: formData.pep_status,
        pep_details: formData.pep_details,
        sanctioned_entity: formData.sanctioned_entity,
        adverse_media: formData.adverse_media,
        base_risk_score: riskScore,
        current_risk_rating: riskRating,
        current_dd_level: ddLevel,
        onboarding_status: 'pending_review',
        client_status: 'active',
        edd_required: riskRating === 'High' || riskRating === 'Very High',
        review_frequency: getReviewFrequency(riskRating),
        metadata: {
          framework_type: frameworkType,
          ...(isInsurer && {
            policy_type: formData.policy_type,
            premium_amount: formData.premium_amount,
            premium_frequency: formData.premium_frequency,
            beneficiary_name: formData.beneficiary_name,
            beneficiary_relationship: formData.beneficiary_relationship
          }),
          ...(isAccountant && {
            service_type: formData.service_type,
            engagement_purpose: formData.engagement_purpose,
            complex_ownership: formData.complex_ownership
          }),
          identification: {
            type: formData.id_document_type,
            number: formData.id_document_number,
            issuing_authority: formData.id_issuing_authority,
            issue_date: formData.id_issue_date,
            expiry_date: formData.id_expiry_date
          }
        }
      };

      const { data, error } = await supabase
        .from('kyc_clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      onSuccess(data);
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = () => {
    let score = 0;

    // Customer risk factors
    if (formData.pep_status) score += 30;
    if (formData.sanctioned_entity) score += 40;
    if (formData.adverse_media) score += 20;
    if (formData.client_type === 'corporate' && formData.complex_ownership) score += 20;

    // Insurance specific
    if (isInsurer) {
      if (formData.policy_type === 'single_premium_life') score += 25;
      if (formData.policy_type === 'investment_linked') score += 25;
      if (formData.policy_type === 'annuity') score += 20;
      if (parseInt(formData.premium_amount) > 50000000) score += 20; // Large premium
    }

    // Accounting specific
    if (isAccountant) {
      if (formData.service_type.includes('company_formation')) score += 25;
      if (formData.service_type.includes('manage_funds')) score += 30;
      if (formData.service_type.includes('open_accounts')) score += 25;
      if (formData.service_type.includes('buy_sell_business')) score += 20;
    }

    return Math.min(score, 100);
  };

  const getRiskRating = (score) => {
    if (score >= 81) return 'Very High';
    if (score >= 61) return 'High';
    if (score >= 31) return 'Substantial';
    if (score >= 16) return 'Medium';
    return 'Low';
  };

  const getDDLevel = (rating) => {
    if (rating === 'Very High' || rating === 'High') return 'enhanced';
    if (rating === 'Low') return 'simplified';
    return 'standard';
  };

  const getReviewFrequency = (rating) => {
    if (rating === 'Very High' || rating === 'High') return 'quarterly';
    if (rating === 'Substantial') return 'semi_annual';
    return 'annual';
  };

  const renderStep1 = () => (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: colors.navyDark,
        marginBottom: spacing.space3
      }}>
        Basic Client Information
      </h3>

      <div style={{ marginBottom: spacing.space2 }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: colors.gray700,
          marginBottom: '6px'
        }}>
          Client Type *
        </label>
        <select
          value={formData.client_type}
          onChange={(e) => updateField('client_type', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: borderRadius.sm,
            fontSize: '14px'
          }}
        >
          <option value="individual">Individual / Natural Person</option>
          <option value="corporate">Corporate / Legal Entity</option>
        </select>
      </div>

      <div style={{ marginBottom: spacing.space2 }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: colors.gray700,
          marginBottom: '6px'
        }}>
          {formData.client_type === 'individual' ? 'Full Name' : 'Company Name'} *
        </label>
        <input
          type="text"
          value={formData.client_name}
          onChange={(e) => updateField('client_name', e.target.value)}
          placeholder={formData.client_type === 'individual' ? 'Enter full name' : 'Enter company name'}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: borderRadius.sm,
            fontSize: '14px'
          }}
        />
      </div>

      {formData.client_type === 'individual' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space2 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.gray700,
                marginBottom: '6px'
              }}>
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.gray700,
                marginBottom: '6px'
              }}>
                Nationality *
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => updateField('nationality', e.target.value)}
                placeholder="Enter nationality"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space2 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.gray700,
                marginBottom: '6px'
              }}>
                Registration Number *
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => updateField('registration_number', e.target.value)}
                placeholder="Enter registration number"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.gray700,
                marginBottom: '6px'
              }}>
                Country of Registration *
              </label>
              <input
                type="text"
                value={formData.registration_country}
                onChange={(e) => updateField('registration_country', e.target.value)}
                placeholder="Enter country"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: spacing.space2 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.gray700,
              marginBottom: '6px'
            }}>
              Business Activity / Industry Sector *
            </label>
            <input
              type="text"
              value={formData.business_activity}
              onChange={(e) => updateField('business_activity', e.target.value)}
              placeholder="Describe business activities"
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray300}`,
                borderRadius: borderRadius.sm,
                fontSize: '14px'
              }}
            />
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space2 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="client@example.com"
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => updateField('phone_number', e.target.value)}
            placeholder="+255..."
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: spacing.space2 }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: colors.gray700,
          marginBottom: '6px'
        }}>
          Physical Address *
        </label>
        <textarea
          value={formData.physical_address}
          onChange={(e) => updateField('physical_address', e.target.value)}
          placeholder="Enter physical address"
          rows={2}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: borderRadius.sm,
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: colors.navyDark,
        marginBottom: spacing.space3
      }}>
        Identification Documents
      </h3>

      <div style={{ marginBottom: spacing.space2 }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: colors.gray700,
          marginBottom: '6px'
        }}>
          Document Type *
        </label>
        <select
          value={formData.id_document_type}
          onChange={(e) => updateField('id_document_type', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: borderRadius.sm,
            fontSize: '14px'
          }}
        >
          <option value="">Select document type</option>
          <option value="national_id">National ID</option>
          <option value="passport">Passport</option>
          <option value="driving_license">Driving License</option>
          <option value="voter_card">Voter Registration Card</option>
          {formData.client_type === 'corporate' && (
            <option value="certificate_incorporation">Certificate of Incorporation</option>
          )}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space2 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Document Number *
          </label>
          <input
            type="text"
            value={formData.id_document_number}
            onChange={(e) => updateField('id_document_number', e.target.value)}
            placeholder="Enter document number"
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Issuing Authority
          </label>
          <input
            type="text"
            value={formData.id_issuing_authority}
            onChange={(e) => updateField('id_issuing_authority', e.target.value)}
            placeholder="e.g., NIDA, Immigration"
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space3 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Issue Date
          </label>
          <input
            type="date"
            value={formData.id_issue_date}
            onChange={(e) => updateField('id_issue_date', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Expiry Date
          </label>
          <input
            type="date"
            value={formData.id_expiry_date}
            onChange={(e) => updateField('id_expiry_date', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: colors.navyDark,
        marginTop: spacing.space4,
        marginBottom: spacing.space3
      }}>
        Financial Information
      </h3>

      <div style={{ marginBottom: spacing.space2 }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: colors.gray700,
          marginBottom: '6px'
        }}>
          Source of Funds *
        </label>
        <select
          value={formData.source_of_funds}
          onChange={(e) => updateField('source_of_funds', e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: borderRadius.sm,
            fontSize: '14px'
          }}
        >
          <option value="">Select source of funds</option>
          <option value="salary">Salary / Employment Income</option>
          <option value="business_income">Business Income</option>
          <option value="investment_income">Investment Income</option>
          <option value="inheritance">Inheritance</option>
          <option value="loan">Loan</option>
          <option value="savings">Savings</option>
          <option value="gift">Gift</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{ marginBottom: spacing.space2 }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '600',
          color: colors.gray700,
          marginBottom: '6px'
        }}>
          Source of Wealth *
        </label>
        <input
          type="text"
          value={formData.source_of_wealth}
          onChange={(e) => updateField('source_of_wealth', e.target.value)}
          placeholder="Describe how wealth was accumulated"
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.gray300}`,
            borderRadius: borderRadius.sm,
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space2 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Estimated Annual Income (TZS)
          </label>
          <input
            type="number"
            value={formData.estimated_annual_income}
            onChange={(e) => updateField('estimated_annual_income', e.target.value)}
            placeholder="e.g., 50000000"
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Estimated Net Worth (TZS)
          </label>
          <input
            type="number"
            value={formData.estimated_net_worth}
            onChange={(e) => updateField('estimated_net_worth', e.target.value)}
            placeholder="e.g., 200000000"
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px'
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: colors.navyDark,
        marginBottom: spacing.space3
      }}>
        {isInsurer ? 'Insurance Policy Information' : isAccountant ? 'Professional Engagement Details' : 'Service Information'}
      </h3>

      {isInsurer && (
        <>
          <div style={{ marginBottom: spacing.space2 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.gray700,
              marginBottom: '6px'
            }}>
              Type of Insurance Product *
            </label>
            <select
              value={formData.policy_type}
              onChange={(e) => updateField('policy_type', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray300}`,
                borderRadius: borderRadius.sm,
                fontSize: '14px'
              }}
            >
              <option value="">Select policy type</option>
              <option value="life_insurance">Life Insurance</option>
              <option value="health_insurance">Health Insurance</option>
              <option value="motor_insurance">Motor Insurance</option>
              <option value="property_insurance">Property Insurance</option>
              <option value="single_premium_life">Single Premium Life Insurance (High Risk)</option>
              <option value="investment_linked">Investment-Linked Life Policy (High Risk)</option>
              <option value="annuity">Annuity Contract (Medium Risk)</option>
              <option value="endowment">Endowment Policy</option>
              <option value="pension">Pension Product</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.space2, marginBottom: spacing.space2 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.gray700,
                marginBottom: '6px'
              }}>
                Premium Amount (TZS) *
              </label>
              <input
                type="number"
                value={formData.premium_amount}
                onChange={(e) => updateField('premium_amount', e.target.value)}
                placeholder="e.g., 5000000"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.gray700,
                marginBottom: '6px'
              }}>
                Premium Payment Frequency *
              </label>
              <select
                value={formData.premium_frequency}
                onChange={(e) => updateField('premium_frequency', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray300}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '14px'
                }}
              >
                <option value="">Select frequency</option>
                <option value="single">Single Premium (High Risk)</option>
                <option value="annual">Annual</option>
                <option value="semi_annual">Semi-Annual</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: spacing.space2 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.gray700,
              marginBottom: '6px'
            }}>
              Beneficiary Name
            </label>
            <input
              type="text"
              value={formData.beneficiary_name}
              onChange={(e) => updateField('beneficiary_name', e.target.value)}
              placeholder="Enter beneficiary name"
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray300}`,
                borderRadius: borderRadius.sm,
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: spacing.space2 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.gray700,
              marginBottom: '6px'
            }}>
              Beneficiary Relationship
            </label>
            <input
              type="text"
              value={formData.beneficiary_relationship}
              onChange={(e) => updateField('beneficiary_relationship', e.target.value)}
              placeholder="e.g., Spouse, Child, Parent"
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray300}`,
                borderRadius: borderRadius.sm,
                fontSize: '14px'
              }}
            />
          </div>
        </>
      )}

      {isAccountant && (
        <>
          <div style={{ marginBottom: spacing.space3 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.gray700,
              marginBottom: '8px'
            }}>
              Type of Services Requested * (Select all that apply)
            </label>
            {[
              { value: 'audit', label: 'Audit Services', risk: 'Low' },
              { value: 'accounting', label: 'Accounting / Bookkeeping', risk: 'Low' },
              { value: 'tax_advisory', label: 'Tax Advisory', risk: 'Medium' },
              { value: 'company_formation', label: 'Company Formation (High Risk)', risk: 'High' },
              { value: 'manage_funds', label: 'Managing Client Funds/Assets (Very High Risk)', risk: 'Very High' },
              { value: 'open_accounts', label: 'Opening Bank Accounts for Client (High Risk)', risk: 'High' },
              { value: 'buy_sell_business', label: 'Buying/Selling Companies (High Risk)', risk: 'High' },
              { value: 'restructuring', label: 'Corporate Restructuring', risk: 'Medium' },
              { value: 'financial_advisory', label: 'Financial Advisory', risk: 'Medium' }
            ].map(service => (
              <div key={service.value} style={{
                marginBottom: '8px',
                padding: '8px',
                background: formData.service_type.includes(service.value) ? colors.goldLight : colors.gray50,
                borderRadius: borderRadius.sm,
                border: `1px solid ${formData.service_type.includes(service.value) ? colors.gold : colors.gray200}`
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.service_type.includes(service.value)}
                    onChange={(e) => {
                      const newServices = e.target.checked
                        ? [...formData.service_type, service.value]
                        : formData.service_type.filter(s => s !== service.value);
                      updateField('service_type', newServices);
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontWeight: '600', color: colors.navyDark }}>
                    {service.label}
                  </span>
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: service.risk === 'Very High' ? colors.redLight :
                              service.risk === 'High' ? colors.amberLight :
                              service.risk === 'Medium' ? colors.goldLight : colors.greenLight,
                    color: service.risk === 'Very High' ? colors.red :
                           service.risk === 'High' ? colors.amberDark :
                           service.risk === 'Medium' ? colors.gold : colors.greenDark,
                    fontWeight: '600'
                  }}>
                    {service.risk} Risk
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: spacing.space2 }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.gray700,
              marginBottom: '6px'
            }}>
              Purpose of Engagement *
            </label>
            <textarea
              value={formData.engagement_purpose}
              onChange={(e) => updateField('engagement_purpose', e.target.value)}
              placeholder="Describe the purpose and scope of the professional engagement"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.gray300}`,
                borderRadius: borderRadius.sm,
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{
            marginBottom: spacing.space2,
            padding: '12px',
            background: colors.gray50,
            borderRadius: borderRadius.sm,
            border: `1px solid ${colors.gray200}`
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
              <input
                type="checkbox"
                checked={formData.complex_ownership}
                onChange={(e) => updateField('complex_ownership', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontWeight: '600', color: colors.navyDark }}>
                Client has complex ownership structure (multiple layers, nominees, trusts)
              </span>
              {formData.complex_ownership && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: colors.amberLight,
                  color: colors.amberDark,
                  fontWeight: '600'
                }}>
                  +20 Risk Score
                </span>
              )}
            </label>
          </div>
        </>
      )}

      {!isInsurer && !isAccountant && (
        <div style={{ marginBottom: spacing.space2 }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: colors.gray700,
            marginBottom: '6px'
          }}>
            Purpose of Relationship *
          </label>
          <textarea
            value={formData.purpose_of_relationship}
            onChange={(e) => updateField('purpose_of_relationship', e.target.value)}
            placeholder="Describe the purpose of establishing this business relationship"
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.gray300}`,
              borderRadius: borderRadius.sm,
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '700',
        color: colors.navyDark,
        marginBottom: spacing.space3
      }}>
        Risk Assessment & Compliance
      </h3>

      <div style={{
        background: colors.amberLight,
        padding: '16px',
        borderRadius: borderRadius.md,
        marginBottom: spacing.space3,
        border: `2px solid ${colors.amber}`
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: '700',
          color: colors.amberDark
        }}>
          ⚠️ Politically Exposed Person (PEP) Declaration
        </h4>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '13px',
          marginBottom: '12px'
        }}>
          <input
            type="checkbox"
            checked={formData.pep_status}
            onChange={(e) => updateField('pep_status', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontWeight: '600', color: colors.navyDark }}>
            Client is a Politically Exposed Person (PEP) or related to a PEP
          </span>
        </label>
        {formData.pep_status && (
          <textarea
            value={formData.pep_details}
            onChange={(e) => updateField('pep_details', e.target.value)}
            placeholder="Provide details: position held, country, relationship, etc."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.amber}`,
              borderRadius: borderRadius.sm,
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        )}
      </div>

      <div style={{
        background: colors.redLight,
        padding: '16px',
        borderRadius: borderRadius.md,
        marginBottom: spacing.space2,
        border: `2px solid ${colors.red}`
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: '700',
          color: colors.red
        }}>
          🚫 Sanctions & Legal Compliance
        </h4>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '13px',
          marginBottom: '8px'
        }}>
          <input
            type="checkbox"
            checked={formData.sanctioned_entity}
            onChange={(e) => updateField('sanctioned_entity', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontWeight: '600', color: colors.navyDark }}>
            Client is subject to sanctions or listed on UN/OFAC sanctions lists
          </span>
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '13px'
        }}>
          <input
            type="checkbox"
            checked={formData.adverse_media}
            onChange={(e) => updateField('adverse_media', e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontWeight: '600', color: colors.navyDark }}>
            Client has adverse media coverage (financial crimes, corruption, etc.)
          </span>
        </label>
      </div>

      <div style={{
        background: colors.blueLight,
        padding: '20px',
        borderRadius: borderRadius.md,
        border: `2px solid ${colors.blue}`,
        marginTop: spacing.space4
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '700',
          color: colors.blueDark
        }}>
          📊 Risk Score Preview
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing.space2
        }}>
          <div>
            <div style={{ fontSize: '12px', color: colors.gray600, marginBottom: '4px' }}>
              Calculated Risk Score
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: getRiskRating(calculateRiskScore()) === 'Very High' ? colors.red :
                     getRiskRating(calculateRiskScore()) === 'High' ? colors.amber :
                     getRiskRating(calculateRiskScore()) === 'Substantial' ? colors.gold :
                     getRiskRating(calculateRiskScore()) === 'Medium' ? colors.blue : colors.green
            }}>
              {calculateRiskScore()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.gray600, marginBottom: '4px' }}>
              Risk Rating
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: getRiskRating(calculateRiskScore()) === 'Very High' ? colors.red :
                     getRiskRating(calculateRiskScore()) === 'High' ? colors.amber :
                     getRiskRating(calculateRiskScore()) === 'Substantial' ? colors.gold :
                     getRiskRating(calculateRiskScore()) === 'Medium' ? colors.blue : colors.green
            }}>
              {getRiskRating(calculateRiskScore())}
            </div>
            <div style={{ fontSize: '11px', color: colors.gray600, marginTop: '4px' }}>
              DD Level: <strong>{getDDLevel(getRiskRating(calculateRiskScore())).toUpperCase()}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isStepValid = () => {
    if (currentStep === 1) {
      return formData.client_name && formData.email && formData.phone_number && formData.physical_address &&
        (formData.client_type === 'individual' ? (formData.date_of_birth && formData.nationality) :
         (formData.registration_number && formData.registration_country));
    }
    if (currentStep === 2) {
      return formData.id_document_type && formData.id_document_number && formData.source_of_funds && formData.source_of_wealth;
    }
    if (currentStep === 3) {
      if (isInsurer) {
        return formData.policy_type && formData.premium_amount && formData.premium_frequency;
      }
      if (isAccountant) {
        return formData.service_type.length > 0 && formData.engagement_purpose;
      }
      return true;
    }
    return true;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        ...contentCard,
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <div style={{
          position: 'sticky',
          top: 0,
          background: colors.white,
          zIndex: 10,
          paddingBottom: spacing.space2,
          borderBottom: `2px solid ${colors.gray200}`,
          marginBottom: spacing.space3
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.space2
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: colors.navyDark
            }}>
              Create New Client {isInsurer ? '(Insurer KYC)' : isAccountant ? '(Accountant/Auditor KYC)' : '(General DNFBP KYC)'}
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: colors.gray500,
                padding: '4px 8px'
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {[1, 2, 3, 4].map(step => (
              <div key={step} style={{
                flex: 1,
                height: '4px',
                background: step <= currentStep ? colors.gold : colors.gray200,
                borderRadius: '2px',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: colors.gray600,
            marginTop: '6px',
            fontWeight: '600'
          }}>
            <span style={{ color: currentStep >= 1 ? colors.gold : colors.gray600 }}>Basic Info</span>
            <span style={{ color: currentStep >= 2 ? colors.gold : colors.gray600 }}>ID & Finance</span>
            <span style={{ color: currentStep >= 3 ? colors.gold : colors.gray600 }}>
              {isInsurer ? 'Policy Info' : isAccountant ? 'Services' : 'Services'}
            </span>
            <span style={{ color: currentStep >= 4 ? colors.gold : colors.gray600 }}>Risk Assessment</span>
          </div>
        </div>

        <div style={{ marginBottom: spacing.space4 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: spacing.space2,
          paddingTop: spacing.space2,
          borderTop: `2px solid ${colors.gray200}`,
          position: 'sticky',
          bottom: 0,
          background: colors.white,
          zIndex: 10
        }}>
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || loading}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: `2px solid ${colors.gray300}`,
              borderRadius: borderRadius.md,
              color: colors.navyDark,
              fontSize: '14px',
              fontWeight: '600',
              cursor: currentStep === 1 || loading ? 'not-allowed' : 'pointer',
              opacity: currentStep === 1 || loading ? 0.5 : 1
            }}
          >
            ← Previous
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!isStepValid() || loading}
              style={{
                ...primaryButton,
                opacity: !isStepValid() || loading ? 0.5 : 1,
                cursor: !isStepValid() || loading ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...primaryButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Client...' : '✓ Create Client'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
