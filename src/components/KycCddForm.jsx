import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { kycSections, KYC_SECTIONS } from '../data/kycCddData';
import { calculateKycRiskScore, validateKycSection, getNextReviewDate, checkSuspiciousActivity } from '../utils/kycRiskCalculator';

export default function KycCddForm({ recordId: propRecordId, onSave, onCancel }) {
  const { id: paramId } = useParams();
  const { profile } = useAuth();
  const recordId = propRecordId || paramId;
  const [currentSection, setCurrentSection] = useState(0);
  const [customerType, setCustomerType] = useState('natural_person');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [matterId, setMatterId] = useState(null);
  const [matterInfo, setMatterInfo] = useState(null);

  useEffect(() => {
    if (recordId) {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(recordId)) {
        loadRecord();
      } else {
        setMatterId(recordId);
        loadMatter(recordId);
      }
    }
  }, [recordId]);

  const loadMatter = async (mId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_matters')
        .select('*')
        .eq('id', mId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setMatterInfo(data);
        setFormData(prev => ({
          ...prev,
          customer_data: {
            ...(prev.customer_data || {}),
            fullName: data.client_name,
            legalName: data.client_name
          }
        }));
      }
    } catch (error) {
      console.error('Error loading matter:', error);
      alert('Failed to load matter information');
    } finally {
      setLoading(false);
    }
  };

  const loadRecord = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_clients')
        .select('*')
        .eq('id', recordId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomerType(data.customer_type);
        if (data.matter_id) {
          setMatterId(data.matter_id);
          loadMatter(data.matter_id);
        }

        const customerData = data.customer_data || {};
        const customerRiskFactors = customerData.customer_risk_factors || {};
        const cleanCustomerData = { ...customerData };
        delete cleanCustomerData.customer_risk_factors;

        setFormData({
          customer_data: cleanCustomerData,
          beneficial_owners: data.beneficial_owners || [],
          policy_information: data.policy_information || {},
          beneficiaries: data.beneficiaries || [],
          source_of_funds: data.source_of_funds || {},
          pep_declaration: data.pep_declaration || {},
          sanctions_screening: data.sanctions_screening || {},
          customer_risk: customerRiskFactors,
          ongoing_monitoring: data.ongoing_monitoring || {},
          suspicious_indicators: data.suspicious_indicators || {},
          customer_declaration: data.customer_declaration || {},
          compliance_approval: data.compliance_approval || {}
        });
      }
    } catch (error) {
      console.error('Error loading KYC record:', error);
      alert('Failed to load KYC record');
    } finally {
      setLoading(false);
    }
  };

  const getSectionData = (section) => {
    switch (section.id) {
      case KYC_SECTIONS.NATURAL_PERSON:
      case KYC_SECTIONS.LEGAL_ENTITY:
        return formData.customer_data || {};
      case KYC_SECTIONS.BENEFICIAL_OWNERSHIP:
        return { beneficial_owners: formData.beneficial_owners || [] };
      case KYC_SECTIONS.PERSON_ACTING:
        return formData.customer_data || {};
      case KYC_SECTIONS.POLICY_INFO:
        return formData.policy_information || {};
      case KYC_SECTIONS.BENEFICIARY_INFO:
        return { beneficiaries: formData.beneficiaries || [] };
      case KYC_SECTIONS.SOURCE_FUNDS:
        return formData.source_of_funds || {};
      case KYC_SECTIONS.PEP_DECLARATION:
        return formData.pep_declaration || {};
      case KYC_SECTIONS.SANCTIONS_SCREENING:
        return formData.sanctions_screening || {};
      case KYC_SECTIONS.CUSTOMER_RISK:
        return formData.customer_risk || {};
      case KYC_SECTIONS.ONGOING_MONITORING:
        return formData.ongoing_monitoring || {};
      case KYC_SECTIONS.SUSPICIOUS_INDICATORS:
        return formData.suspicious_indicators || {};
      case KYC_SECTIONS.CUSTOMER_DECLARATION:
        return formData.customer_declaration || {};
      case KYC_SECTIONS.INSURER_USE:
        return formData.compliance_approval || {};
      default:
        return {};
    }
  };

  const updateSectionData = (section, fieldName, value) => {
    const newFormData = { ...formData };

    switch (section.id) {
      case KYC_SECTIONS.NATURAL_PERSON:
      case KYC_SECTIONS.LEGAL_ENTITY:
      case KYC_SECTIONS.PERSON_ACTING:
        newFormData.customer_data = { ...newFormData.customer_data, [fieldName]: value };
        break;
      case KYC_SECTIONS.BENEFICIAL_OWNERSHIP:
        if (fieldName === 'beneficial_owners') {
          newFormData.beneficial_owners = value;
        } else {
          newFormData.customer_data = { ...newFormData.customer_data, [fieldName]: value };
        }
        break;
      case KYC_SECTIONS.POLICY_INFO:
        newFormData.policy_information = { ...newFormData.policy_information, [fieldName]: value };
        break;
      case KYC_SECTIONS.BENEFICIARY_INFO:
        newFormData.beneficiaries = value;
        break;
      case KYC_SECTIONS.SOURCE_FUNDS:
        newFormData.source_of_funds = { ...newFormData.source_of_funds, [fieldName]: value };
        break;
      case KYC_SECTIONS.PEP_DECLARATION:
        newFormData.pep_declaration = { ...newFormData.pep_declaration, [fieldName]: value };
        break;
      case KYC_SECTIONS.SANCTIONS_SCREENING:
        newFormData.sanctions_screening = { ...newFormData.sanctions_screening, [fieldName]: value };
        break;
      case KYC_SECTIONS.CUSTOMER_RISK:
        newFormData.customer_risk = { ...newFormData.customer_risk, [fieldName]: value };
        break;
      case KYC_SECTIONS.ONGOING_MONITORING:
        newFormData.ongoing_monitoring = { ...newFormData.ongoing_monitoring, [fieldName]: value };
        break;
      case KYC_SECTIONS.SUSPICIOUS_INDICATORS:
        newFormData.suspicious_indicators = { ...newFormData.suspicious_indicators, [fieldName]: value };
        break;
      case KYC_SECTIONS.CUSTOMER_DECLARATION:
        newFormData.customer_declaration = { ...newFormData.customer_declaration, [fieldName]: value };
        break;
      case KYC_SECTIONS.INSURER_USE:
        newFormData.compliance_approval = { ...newFormData.compliance_approval, [fieldName]: value };
        break;
    }

    setFormData(newFormData);
  };

  const renderField = (field, section, sectionData) => {
    const value = sectionData[field.name] || '';

    if (field.type === 'select' && field.options?.length === 2 && field.options.includes('Yes') && field.options.includes('No')) {
      return (
        <div key={field.name} style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
            {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => updateSectionData(section, field.name, 'Yes')}
              style={{
                padding: '10px 30px',
                backgroundColor: value === 'Yes' ? '#28a745' : '#e9ecef',
                color: value === 'Yes' ? 'white' : '#495057',
                border: value === 'Yes' ? '2px solid #28a745' : '2px solid #ced4da',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => updateSectionData(section, field.name, 'No')}
              style={{
                padding: '10px 30px',
                backgroundColor: value === 'No' ? '#dc3545' : '#e9ecef',
                color: value === 'No' ? 'white' : '#495057',
                border: value === 'No' ? '2px solid #dc3545' : '2px solid #ced4da',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              No
            </button>
          </div>
        </div>
      );
    }

    if (field.type === 'repeater') {
      if (field.name === 'beneficial_owners') {
        const hasBeneficialOwners = sectionData.has_beneficial_owners || formData.customer_data?.has_beneficial_owners;
        if (hasBeneficialOwners !== 'Yes') {
          return null;
        }
      }

      return (
        <div key={field.name} className="repeater-field">
          <label style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
            {field.label}
          </label>
          {(value.length > 0 ? value : [{}]).map((item, index) => (
            <div key={index} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
              <h4 style={{ marginTop: 0 }}>Entry {index + 1}</h4>
              {field.subfields.map(subfield => (
                <div key={subfield.name} style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    {subfield.label} {subfield.required && <span style={{ color: 'red' }}>*</span>}
                  </label>
                  {renderSubfield(subfield, item, (subfieldValue) => {
                    const newArray = [...(value.length > 0 ? value : [{}])];
                    newArray[index] = { ...newArray[index], [subfield.name]: subfieldValue };
                    updateSectionData(section, field.name, newArray);
                  })}
                </div>
              ))}
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const newArray = value.filter((_, i) => i !== index);
                    updateSectionData(section, field.name, newArray);
                  }}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const newArray = [...(value.length > 0 ? value : []), {}];
              updateSectionData(section, field.name, newArray);
            }}
            style={{
              padding: '8px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add {field.label}
          </button>
        </div>
      );
    }

    return (
      <div key={field.name} style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
          {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
        </label>
        {field.helpText && (
          <div style={{
            fontSize: '13px',
            color: '#666',
            marginBottom: '5px',
            fontStyle: 'italic'
          }}>
            {field.helpText}
          </div>
        )}
        {renderInputField(field, value, (newValue) => updateSectionData(section, field.name, newValue))}
      </div>
    );
  };

  const renderSubfield = (field, itemData, onChange) => {
    const value = itemData[field.name] || '';
    return renderInputField(field, value, onChange);
  };

  const renderInputField = (field, value, onChange) => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minHeight: '80px'
            }}
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            <option value="">Select...</option>
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        );
      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        );
    }
  };

  const handleNext = () => {
    const availableSections = kycSections.filter(s => s.customerTypes.includes(customerType));
    if (currentSection < availableSections.length - 1) {
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

  const findOrCreateClient = async () => {
    try {
      const clientName = formData.customer_data?.fullName || formData.customer_data?.legalName;
      if (!clientName) return null;

      const { data: existingClients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('client_name', clientName)
        .maybeSingle();

      if (existingClients) {
        return existingClients.id;
      }

      const clientData = {
        organization_id: profile.organization_id,
        client_name: clientName,
        client_type: customerType === 'natural_person' ? 'individual' : 'legal_entity',
        client_identifier: formData.customer_data?.nationalId || formData.customer_data?.registrationNumber || formData.customer_data?.tinNumber,
        email: formData.customer_data?.email,
        phone: formData.customer_data?.phoneNumber || formData.customer_data?.contactPhone,
        address: formData.customer_data?.residentialAddress || formData.customer_data?.registeredAddress,
        country: formData.customer_data?.nationality || formData.customer_data?.countryOfIncorporation,
        created_by: profile.id
      };

      const { data: newClient, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;
      return newClient.id;
    } catch (error) {
      console.error('Error creating client:', error);
      return null;
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      setSaveMessage('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const clientId = await findOrCreateClient();

      const customerDataWithRisk = {
        ...(formData.customer_data || {}),
        customer_risk_factors: formData.customer_risk || {}
      };

      const kycRecord = {
        customer_type: customerType,
        customer_data: customerDataWithRisk,
        beneficial_owners: formData.beneficial_owners || [],
        policy_information: formData.policy_information || {},
        beneficiaries: formData.beneficiaries || [],
        source_of_funds: formData.source_of_funds || {},
        pep_declaration: formData.pep_declaration || {},
        sanctions_screening: formData.sanctions_screening || {},
        ongoing_monitoring: formData.ongoing_monitoring || {},
        suspicious_indicators: formData.suspicious_indicators || [],
        organization_id: profile?.organization_id || null,
        customer_declaration: formData.customer_declaration || {},
        compliance_approval: formData.compliance_approval || {},
        matter_id: matterId || null,
        client_id: clientId,
        status: 'draft'
      };

      if (recordId) {
        const { error } = await supabase
          .from('kyc_clients')
          .update(kycRecord)
          .eq('id', recordId);

        if (error) throw error;
      } else {
        kycRecord.user_id = user.id;
        const { data, error } = await supabase
          .from('kyc_clients')
          .insert([kycRecord])
          .select()
          .single();

        if (error) throw error;
        if (onSave) onSave(data);
      }

      setSaveMessage('Draft saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const clientId = await findOrCreateClient();

      const riskCalculation = calculateKycRiskScore({
        customer_data: formData.customer_data,
        policy_information: formData.policy_information,
        source_of_funds: formData.source_of_funds,
        pep_declaration: formData.pep_declaration,
        customer_risk: formData.customer_risk,
        ongoing_monitoring: formData.ongoing_monitoring,
        suspicious_indicators: formData.suspicious_indicators,
        beneficiaries: formData.beneficiaries
      });

      const suspiciousAlerts = checkSuspiciousActivity({
        policy_information: formData.policy_information,
        source_of_funds: formData.source_of_funds,
        ongoing_monitoring: formData.ongoing_monitoring,
        suspicious_indicators: formData.suspicious_indicators
      });

      const nextReview = getNextReviewDate(riskCalculation.riskLevel);

      // Determine DD level based on risk score
      let ddLevel = 'standard';
      if (riskCalculation.totalScore <= 30) {
        ddLevel = 'simplified';
      } else if (riskCalculation.totalScore > 60) {
        ddLevel = 'enhanced';
      }

      // Determine review frequency based on DD level
      let reviewFrequency = 'quarterly';
      if (ddLevel === 'simplified') {
        reviewFrequency = 'annual';
      } else if (ddLevel === 'enhanced') {
        reviewFrequency = (riskCalculation.riskLevel === 'Very High') ? 'monthly' : 'quarterly';
      }

      const customerDataWithRisk = {
        ...(formData.customer_data || {}),
        customer_risk_factors: formData.customer_risk || {}
      };

      const kycRecord = {
        customer_type: customerType,
        customer_data: customerDataWithRisk,
        beneficial_owners: formData.beneficial_owners || [],
        policy_information: formData.policy_information || {},
        beneficiaries: formData.beneficiaries || [],
        source_of_funds: formData.source_of_funds || {},
        pep_declaration: formData.pep_declaration || {},
        sanctions_screening: formData.sanctions_screening || {},
        ongoing_monitoring: formData.ongoing_monitoring || {},
        suspicious_indicators: formData.suspicious_indicators || [],
        organization_id: profile?.organization_id || null,
        customer_declaration: formData.customer_declaration || {},
        compliance_approval: formData.compliance_approval || {},
        matter_id: matterId || null,
        client_id: clientId,
        risk_assessment: riskCalculation.riskAssessment,
        total_risk_score: riskCalculation.totalScore,
        risk_level: riskCalculation.riskLevel,
        enhanced_dd_required: riskCalculation.enhancedDdRequired,
        monitoring_frequency: riskCalculation.monitoringFrequency,
        last_review_date: new Date().toISOString(),
        next_review_date: nextReview.toISOString(),
        status: 'pending_approval',
        // Three-tier DD framework fields
        current_dd_level: ddLevel,
        review_frequency: reviewFrequency,
        monitoring_status: 'active',
        customer_status: 'active',
        senior_approval_status: ddLevel === 'enhanced' ? 'pending' : 'not_required',
        source_of_funds_verified: false,
        source_of_wealth_verified: false,
        first_payment_verified: false
      };

      if (recordId) {
        const { error } = await supabase
          .from('kyc_clients')
          .update(kycRecord)
          .eq('id', recordId);

        if (error) throw error;
      } else {
        kycRecord.user_id = user.id;
        const { data, error } = await supabase
          .from('kyc_clients')
          .insert([kycRecord])
          .select()
          .single();

        if (error) throw error;
        if (onSave) onSave(data);
      }

      alert('KYC/CDD record submitted successfully');
      if (onCancel) onCancel();
    } catch (error) {
      console.error('Error submitting KYC record:', error);
      alert('Failed to submit KYC record: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const availableSections = kycSections.filter(s => s.customerTypes.includes(customerType));
  const section = availableSections[currentSection];
  const sectionData = getSectionData(section);

  if (loading && !section) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '10px' }}>KYC / CDD Questionnaire for Insurers</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Based on Tanzania AML Act, AML Regulations 2022, and FIU AML/CFT Guidelines to Insurers
        </p>
        {matterInfo && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
              Linked to Matter: {matterInfo.matter_name}
            </div>
            <div style={{ fontSize: '13px', color: '#3b82f6', marginTop: '4px' }}>
              Client: {matterInfo.client_name}
            </div>
          </div>
        )}

        {!recordId && currentSection === 0 && (
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                Customer Type <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              >
                <option value="natural_person">Natural Person</option>
                <option value="legal_entity">Legal Entity</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '20px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {availableSections.map((s, index) => (
            <div
              key={s.id}
              style={{
                padding: '8px 12px',
                backgroundColor: index === currentSection ? '#007bff' : index < currentSection ? '#28a745' : '#e9ecef',
                color: index <= currentSection ? 'white' : '#666',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Section {index + 1}
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>{section.title}</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>{section.description}</p>

        <div>
          {section.subsections ? (
            section.subsections.map((subsection, idx) => (
              <div key={idx} style={{ marginBottom: '40px' }}>
                <h3 style={{
                  color: '#2c3e50',
                  marginBottom: '10px',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #e9ecef',
                  fontSize: '18px'
                }}>
                  {subsection.title}
                </h3>
                {subsection.helpText && (
                  <div style={{
                    backgroundColor: '#e3f2fd',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '20px',
                    borderLeft: '4px solid #2196f3',
                    fontSize: '14px',
                    color: '#1565c0'
                  }}>
                    <strong>ℹ️ Note:</strong> {subsection.helpText}
                  </div>
                )}
                <div>
                  {subsection.fields.map(field => renderField(field, section, sectionData))}
                </div>
              </div>
            ))
          ) : (
            section.fields.map(field => renderField(field, section, sectionData))
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {currentSection > 0 && (
            <button
              onClick={handlePrevious}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Previous
            </button>
          )}

          {currentSection < availableSections.length - 1 && (
            <button
              onClick={handleNext}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Next
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </button>

          {currentSection === availableSections.length - 1 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {saveMessage && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {saveMessage}
        </div>
      )}
    </div>
  );
}
