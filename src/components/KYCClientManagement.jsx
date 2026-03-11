import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import {
  clientTypes,
  calculateRiskScore,
  getDueDiligenceLevel,
  getRiskLevel,
  getRiskColor,
  getMonitoringFrequency,
  clientRiskFactors,
  serviceRiskFactors,
  geographicRiskFactors,
  behaviourRiskFactors,
  deliveryChannelRiskFactors,
  riskLevels,
  dueDiligenceLevels
} from '../data/kycData';

export default function KYCClientManagement({ initialFilter = 'all' }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [activeTab, setActiveTab] = useState(initialFilter);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isReadOnly = profile?.role === 'management';

  const amlTriggerActivities = [
    { value: 'real_property_transaction', label: 'Purchase/Sale of Real Property' },
    { value: 'commercial_enterprise_transaction', label: 'Purchase/Sale of Commercial Enterprises' },
    { value: 'client_funds_management', label: 'Management of Client Funds/Securities/Assets' },
    { value: 'bank_account_management', label: 'Opening/Management of Bank/Savings Accounts' },
    { value: 'corporation_capital_organization', label: 'Organizing Capital for Corporations/Legal Entities' },
    { value: 'entity_creation_management', label: 'Creation/Management/Direction of Corporations/Legal Entities' },
    { value: 'business_entity_transaction', label: 'Buying/Selling of Business Entities' },
    { value: 'financial_transaction_representation', label: 'Acting on Behalf of Client in Financial Transactions' },
    { value: 'real_estate_transaction_representation', label: 'Acting on Behalf of Client in Real Estate Transactions' }
  ];

  useEffect(() => {
    if (profile?.organization_id) {
      loadClients();
    }
  }, [profile?.organization_id]);

  const loadClients = async () => {
    try {
      let query = supabase
        .from('kyc_clients')
        .select(`
          *,
          client_matter_relationships (
            matter_id,
            matters (
              id,
              status,
              matter_name
            )
          )
        `)
        .eq('organization_id', profile.organization_id);

      // Staff can only see their own assigned clients
      if (profile.role === 'staff') {
        query = query.eq('relationship_manager_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return client.client_status === 'active';
    if (activeTab === 'high_risk') return client.current_risk_rating === riskLevels.HIGH || client.current_risk_rating === riskLevels.VERY_HIGH;
    if (activeTab === 'pep') return client.pep_status === true;
    if (activeTab === 'enhanced_dd') return client.current_dd_level === 'enhanced';
    if (activeTab === 'pending_approval') return client.senior_approval_status === 'pending';
    return true;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading KYC clients..." />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionCard}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>KYC Client Management</h2>
            <p style={styles.subtitle}>Risk-based customer due diligence system</p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setShowNewClientModal(true)}
              style={styles.primaryButton}
            >
              + Add New Client
            </button>
          )}
        </div>

        <div style={styles.statsGrid}>
          <StatCard
            title="Total Clients"
            value={clients.length}
            color="#0a1929"
          />
          <StatCard
            title="Active Clients"
            value={clients.filter(c => c.client_status === 'active').length}
            color="#10b981"
          />
          <StatCard
            title="High Risk Clients"
            value={clients.filter(c => c.current_risk_rating === riskLevels.HIGH || c.current_risk_rating === riskLevels.VERY_HIGH).length}
            color="#ef4444"
          />
          <StatCard
            title="PEP Clients"
            value={clients.filter(c => c.pep_status).length}
            color="#d4af37"
          />
        </div>

        <div style={styles.tabs}>
          <TabButton
            label={`All Clients (${clients.length})`}
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          />
          <TabButton
            label={`Active (${clients.filter(c => c.client_status === 'active').length})`}
            active={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
          />
          <TabButton
            label={`Enhanced DD (${clients.filter(c => c.current_dd_level === 'enhanced').length})`}
            active={activeTab === 'enhanced_dd'}
            onClick={() => setActiveTab('enhanced_dd')}
          />
          <TabButton
            label={`Pending Approval (${clients.filter(c => c.senior_approval_status === 'pending').length})`}
            active={activeTab === 'pending_approval'}
            onClick={() => setActiveTab('pending_approval')}
          />
          <TabButton
            label={`High Risk (${clients.filter(c => c.current_risk_rating === riskLevels.HIGH || c.current_risk_rating === riskLevels.VERY_HIGH).length})`}
            active={activeTab === 'high_risk'}
            onClick={() => setActiveTab('high_risk')}
          />
          <TabButton
            label={`PEP (${clients.filter(c => c.pep_status).length})`}
            active={activeTab === 'pep'}
            onClick={() => setActiveTab('pep')}
          />
        </div>

        <div style={styles.tableContainer}>
          {filteredClients.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No clients found. Add your first client to get started.</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Client Name</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Matters</th>
                  <th style={styles.th}>DD Level</th>
                  <th style={styles.th}>Risk Rating</th>
                  <th style={styles.th}>PEP Status</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Next Review</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const matterCount = client.client_matter_relationships?.length || 0;
                  const activeMatters = client.client_matter_relationships?.filter(
                    rel => rel.matters?.status === 'open' || rel.matters?.status === 'active'
                  ).length || 0;

                  return (
                  <tr key={client.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div>
                        <div style={styles.clientName}>{client.client_name}</div>
                        {client.client_id_number && (
                          <div style={styles.clientId}>ID: {client.client_id_number}</div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}>
                        {clientTypes.find(t => t.value === client.client_type)?.label || client.client_type}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {matterCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#0a1929'
                          }}>
                            {matterCount} total
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#3b82f6',
                            fontWeight: '500'
                          }}>
                            {activeMatters} active
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                          No matters
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {client.current_dd_level && (
                        <span style={{
                          ...styles.riskBadge,
                          backgroundColor:
                            client.current_dd_level === 'simplified' ? '#d1fae520' :
                            client.current_dd_level === 'enhanced' ? '#fca5a520' :
                            '#fef3c720',
                          color:
                            client.current_dd_level === 'simplified' ? '#065f46' :
                            client.current_dd_level === 'enhanced' ? '#991b1b' :
                            '#92400e',
                          fontWeight: client.current_dd_level === 'enhanced' ? '600' : '500',
                          textTransform: 'capitalize'
                        }}>
                          {client.current_dd_level}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {client.current_risk_rating && (
                        <span style={{
                          ...styles.riskBadge,
                          backgroundColor: getRiskColor(client.current_risk_rating) + '20',
                          color: getRiskColor(client.current_risk_rating)
                        }}>
                          {client.current_risk_rating}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {client.pep_status ? (
                        <span style={{...styles.riskBadge, backgroundColor: '#fef3c7', color: '#92400e'}}>
                          PEP
                        </span>
                      ) : (
                        <span style={{...styles.riskBadge, backgroundColor: '#d1fae5', color: '#065f46'}}>
                          Not PEP
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <StatusBadge status={client.client_status} />
                    </td>
                    <td style={styles.td}>
                      {client.next_review_date ? (
                        <span style={styles.dateText}>
                          {new Date(client.next_review_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span style={styles.mutedText}>Not set</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => navigate(`/kyc-client/${client.id}`)}
                        style={styles.actionButton}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {showNewClientModal && (
          <NewClientModal
            onClose={() => setShowNewClientModal(false)}
            onSuccess={() => {
              setShowNewClientModal(false);
              loadClients();
            }}
            organizationId={profile.organization_id}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={{...styles.statValue, color}}>{value}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {})
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    active: { label: 'Active', bg: '#d1fae5', color: '#065f46' },
    inactive: { label: 'Inactive', bg: '#fee2e2', color: '#991b1b' },
    suspended: { label: 'Suspended', bg: '#fef3c7', color: '#92400e' },
    rejected: { label: 'Rejected', bg: '#fecaca', color: '#7f1d1d' }
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <span style={{
      ...styles.riskBadge,
      backgroundColor: config.bg,
      color: config.color
    }}>
      {config.label}
    </span>
  );
}

function NewClientModal({ onClose, onSuccess, organizationId, userId }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    client_type: 'individual',
    client_name: '',
    client_id_number: '',
    date_of_birth: '',
    nationality: '',
    country_of_residence: '',
    business_activity: '',
    source_of_funds: '',
    source_of_wealth: '',
    purpose_of_relationship: '',
    is_pep: false,
    aml_trigger_activities: [],
    riskFactors: {
      client: {},
      service: {},
      geography: {},
      behaviour: {},
      delivery: {}
    }
  });
  const [submitting, setSubmitting] = useState(false);

  const amlTriggerActivities = [
    { value: 'real_property_transaction', label: 'Purchase/Sale of Real Property' },
    { value: 'commercial_enterprise_transaction', label: 'Purchase/Sale of Commercial Enterprises' },
    { value: 'client_funds_management', label: 'Management of Client Funds/Securities/Assets' },
    { value: 'bank_account_management', label: 'Opening/Management of Bank/Savings Accounts' },
    { value: 'corporation_capital_organization', label: 'Organizing Capital for Corporations/Legal Entities' },
    { value: 'entity_creation_management', label: 'Creation/Management/Direction of Corporations/Legal Entities' },
    { value: 'business_entity_transaction', label: 'Buying/Selling of Business Entities' },
    { value: 'financial_transaction_representation', label: 'Acting on Behalf of Client in Financial Transactions' },
    { value: 'real_estate_transaction_representation', label: 'Acting on Behalf of Client in Real Estate Transactions' }
  ];

  const toggleAMLActivity = (activity) => {
    const currentActivities = formData.aml_trigger_activities || [];
    if (currentActivities.includes(activity)) {
      setFormData({
        ...formData,
        aml_trigger_activities: currentActivities.filter(a => a !== activity)
      });
    } else {
      setFormData({
        ...formData,
        aml_trigger_activities: [...currentActivities, activity]
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const riskScore = calculateRiskScore(formData.riskFactors);
      const riskLevel = getRiskLevel(riskScore);
      const dueDiligenceLevel = getDueDiligenceLevel(riskScore);
      const monitoringFreq = getMonitoringFrequency(riskLevel);

      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + monitoringFreq.months);

      // Convert risk score from 0-100 scale to 1-5 scale for database (numeric(3,2))
      const normalizedRiskScore = Math.min(5.0, Math.max(1.0, (riskScore / 100) * 4 + 1));

      const clientData = {
        organization_id: organizationId,
        client_type: formData.client_type,
        client_name: formData.client_name,
        client_id_number: formData.client_id_number || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality || null,
        country_of_residence: formData.country_of_residence || null,
        business_activity: formData.business_activity || null,
        source_of_funds: formData.source_of_funds || null,
        source_of_wealth: formData.source_of_wealth || null,
        purpose_of_relationship: formData.purpose_of_relationship || null,
        aml_trigger_activities: formData.aml_trigger_activities || [],
        pep_status: formData.is_pep || false,
        pep_details: formData.is_pep ? 'PEP details to be verified during enhanced due diligence' : null,
        base_risk_score: normalizedRiskScore.toFixed(2),
        current_risk_rating: riskLevel,
        current_dd_level: dueDiligenceLevel,
        client_status: 'active',
        onboarding_status: 'completed',
        next_review_date: nextReviewDate.toISOString().split('T')[0],
        monitoring_frequency: monitoringFreq.value,
        edd_required: dueDiligenceLevel === dueDiligenceLevels.ENHANCED,
        senior_approval_status: dueDiligenceLevel === dueDiligenceLevels.ENHANCED ? 'pending' : 'not_required',
        created_by: userId,
        relationship_manager_id: userId
      };

      const { data: client, error: clientError } = await supabase
        .from('kyc_clients')
        .insert([clientData])
        .select()
        .single();

      if (clientError) throw clientError;

      onSuccess();
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error creating client: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Add New Client - Step {step} of 3</h3>
          <button onClick={onClose} style={styles.closeButton}>&times;</button>
        </div>

        <div style={styles.modalBody}>
          {step === 1 && (
            <BasicInformationStep
              formData={formData}
              onChange={setFormData}
              amlTriggerActivities={amlTriggerActivities}
              toggleAMLActivity={toggleAMLActivity}
            />
          )}

          {step === 2 && (
            <RiskAssessmentStep
              formData={formData}
              onChange={setFormData}
            />
          )}

          {step === 3 && (
            <ReviewStep
              formData={formData}
              riskScore={calculateRiskScore(formData.riskFactors)}
              riskLevel={getRiskLevel(calculateRiskScore(formData.riskFactors))}
              dueDiligenceLevel={getDueDiligenceLevel(calculateRiskScore(formData.riskFactors))}
            />
          )}
        </div>

        <div style={styles.modalFooter}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              style={styles.secondaryButton}
            >
              Previous
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              style={styles.primaryButton}
              disabled={!isStepValid(step, formData)}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              style={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Client'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicInformationStep({ formData, onChange, amlTriggerActivities, toggleAMLActivity }) {
  return (
    <div style={styles.formSection}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Client Type*</label>
        <select
          value={formData.client_type}
          onChange={(e) => onChange({...formData, client_type: e.target.value})}
          style={styles.select}
        >
          {clientTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Client Name*</label>
        <input
          type="text"
          value={formData.client_name}
          onChange={(e) => onChange({...formData, client_name: e.target.value})}
          style={styles.input}
          placeholder="Full name or company name"
        />
      </div>

      {formData.client_type === 'individual' && (
        <>
          <div style={styles.formGroup}>
            <label style={styles.label}>ID Number</label>
            <input
              type="text"
              value={formData.client_id_number}
              onChange={(e) => onChange({...formData, client_id_number: e.target.value})}
              style={styles.input}
              placeholder="National ID, Passport, etc."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Date of Birth</label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => onChange({...formData, date_of_birth: e.target.value})}
              style={styles.input}
            />
          </div>
        </>
      )}

      <div style={styles.formGroup}>
        <label style={styles.label}>Nationality / Country of Incorporation</label>
        <input
          type="text"
          value={formData.nationality}
          onChange={(e) => onChange({...formData, nationality: e.target.value})}
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Country of Residence / Operation</label>
        <input
          type="text"
          value={formData.country_of_residence}
          onChange={(e) => onChange({...formData, country_of_residence: e.target.value})}
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Business Activity / Occupation</label>
        <input
          type="text"
          value={formData.business_activity}
          onChange={(e) => onChange({...formData, business_activity: e.target.value})}
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Purpose of Relationship*</label>
        <textarea
          value={formData.purpose_of_relationship}
          onChange={(e) => onChange({...formData, purpose_of_relationship: e.target.value})}
          style={{...styles.input, minHeight: '80px'}}
          placeholder="Describe the banking products/services required and the purpose of the relationship"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Source of Funds</label>
        <textarea
          value={formData.source_of_funds}
          onChange={(e) => onChange({...formData, source_of_funds: e.target.value})}
          style={{...styles.input, minHeight: '80px'}}
          placeholder="Describe the origin of funds for this specific transaction or relationship (e.g., salary, business income, sale of property)"
        />
        <span style={styles.helpText}>
          Where does the money for this transaction come from? This is required for Enhanced DD.
        </span>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Source of Wealth</label>
        <textarea
          value={formData.source_of_wealth}
          onChange={(e) => onChange({...formData, source_of_wealth: e.target.value})}
          style={{...styles.input, minHeight: '80px'}}
          placeholder="Describe how the client accumulated their overall wealth (e.g., career earnings, business ownership, inheritance, investments)"
        />
        <span style={styles.helpText}>
          How did the client accumulate their total wealth over time? This is required for Enhanced DD.
        </span>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.is_pep}
            onChange={(e) => onChange({...formData, is_pep: e.target.checked})}
            style={styles.checkbox}
          />
          Client is a Politically Exposed Person (PEP)
        </label>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#fff9e6',
        borderRadius: '8px',
        border: '2px solid #d4af37'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '15px',
          fontWeight: '700',
          color: '#0a1929',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>⚖️</span>
          AML/CTF/CPF Trigger Activities (Tanzania Law)
        </h4>
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          color: '#64748b',
          lineHeight: '1.5'
        }}>
          Select which activities trigger AML/CTF/CPF compliance obligations for this client:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {amlTriggerActivities.map(activity => (
            <label
              key={activity.value}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px',
                background: (formData.aml_trigger_activities || []).includes(activity.value) ? '#f0f9ff' : 'white',
                borderRadius: '6px',
                border: '1px solid ' + ((formData.aml_trigger_activities || []).includes(activity.value) ? '#3b82f6' : '#e5e7eb'),
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="checkbox"
                checked={(formData.aml_trigger_activities || []).includes(activity.value)}
                onChange={() => toggleAMLActivity(activity.value)}
                style={{ width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: '#2d3748', lineHeight: '1.4' }}>
                {activity.label}
              </span>
            </label>
          ))}
        </div>
        {(formData.aml_trigger_activities || []).length > 0 && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: '#fef3c7',
            borderRadius: '6px',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#92400e' }}>
              ⚠️ This client is subject to AML/CTF/CPF compliance obligations under Tanzania law
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskAssessmentStep({ formData, onChange }) {
  const updateRiskFactor = (category, factor, value) => {
    const newRiskFactors = {
      ...formData.riskFactors,
      [category]: {
        ...formData.riskFactors[category],
        [factor]: value
      }
    };
    onChange({...formData, riskFactors: newRiskFactors});
  };

  return (
    <div style={styles.formSection}>
      <h4 style={styles.sectionTitle}>Client Risk Factors (30%)</h4>
      {Object.entries(clientRiskFactors).map(([key, factor]) => (
        <div key={key} style={styles.formGroup}>
          <label style={styles.label}>{factor.label}</label>
          <select
            value={formData.riskFactors.client[key] || ''}
            onChange={(e) => updateRiskFactor('client', key, Number(e.target.value))}
            style={styles.select}
          >
            <option value="">Select...</option>
            {factor.options.map(opt => (
              <option key={opt.value} value={opt.score}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}

      <h4 style={styles.sectionTitle}>Service Risk Factors (25%)</h4>
      {Object.entries(serviceRiskFactors).map(([key, factor]) => (
        <div key={key} style={styles.formGroup}>
          <label style={styles.label}>{factor.label}</label>
          <select
            value={formData.riskFactors.service[key] || ''}
            onChange={(e) => updateRiskFactor('service', key, Number(e.target.value))}
            style={styles.select}
          >
            <option value="">Select...</option>
            {factor.options.map(opt => (
              <option key={opt.value} value={opt.score}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}

      <h4 style={styles.sectionTitle}>Geographic Risk Factors (20%)</h4>
      {Object.entries(geographicRiskFactors).map(([key, factor]) => (
        <div key={key} style={styles.formGroup}>
          <label style={styles.label}>{factor.label}</label>
          <select
            value={formData.riskFactors.geography[key] || ''}
            onChange={(e) => updateRiskFactor('geography', key, Number(e.target.value))}
            style={styles.select}
          >
            <option value="">Select...</option>
            {factor.options.map(opt => (
              <option key={opt.value} value={opt.score}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}

      <h4 style={styles.sectionTitle}>Behaviour Risk Factors (15%)</h4>
      {Object.entries(behaviourRiskFactors).map(([key, factor]) => (
        <div key={key} style={styles.formGroup}>
          <label style={styles.label}>{factor.label}</label>
          <select
            value={formData.riskFactors.behaviour[key] || ''}
            onChange={(e) => updateRiskFactor('behaviour', key, Number(e.target.value))}
            style={styles.select}
          >
            <option value="">Select...</option>
            {factor.options.map(opt => (
              <option key={opt.value} value={opt.score}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}

      <h4 style={styles.sectionTitle}>Delivery Channel Risk Factors (10%)</h4>
      {Object.entries(deliveryChannelRiskFactors).map(([key, factor]) => (
        <div key={key} style={styles.formGroup}>
          <label style={styles.label}>{factor.label}</label>
          <select
            value={formData.riskFactors.delivery[key] || ''}
            onChange={(e) => updateRiskFactor('delivery', key, Number(e.target.value))}
            style={styles.select}
          >
            <option value="">Select...</option>
            {factor.options.map(opt => (
              <option key={opt.value} value={opt.score}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function ReviewStep({ formData, riskScore, riskLevel, dueDiligenceLevel }) {
  return (
    <div style={styles.reviewSection}>
      <h4 style={styles.sectionTitle}>Client Information</h4>
      <div style={styles.reviewGrid}>
        <ReviewItem label="Client Name" value={formData.client_name} />
        <ReviewItem label="Client Type" value={clientTypes.find(t => t.value === formData.client_type)?.label} />
        <ReviewItem label="Nationality" value={formData.nationality || 'Not provided'} />
        <ReviewItem label="Country of Residence" value={formData.country_of_residence || 'Not provided'} />
        <ReviewItem label="PEP Status" value={formData.is_pep ? 'Yes' : 'No'} />
      </div>

      <h4 style={styles.sectionTitle}>Risk Assessment Results</h4>
      <div style={styles.riskResultsGrid}>
        <div style={styles.riskResultCard}>
          <div style={styles.riskResultLabel}>Risk Score</div>
          <div style={{...styles.riskResultValue, color: getRiskColor(riskLevel)}}>
            {riskScore}
          </div>
        </div>
        <div style={styles.riskResultCard}>
          <div style={styles.riskResultLabel}>Risk Level</div>
          <div style={{...styles.riskResultValue, color: getRiskColor(riskLevel)}}>
            {riskLevel}
          </div>
        </div>
        <div style={styles.riskResultCard}>
          <div style={styles.riskResultLabel}>Due Diligence Level</div>
          <div style={styles.riskResultValue}>
            {dueDiligenceLevel.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={styles.infoBox}>
        <strong>Next Steps:</strong>
        <ul style={styles.nextStepsList}>
          {dueDiligenceLevel === dueDiligenceLevels.SIMPLIFIED && (
            <>
              <li>Basic identification and verification</li>
              <li>Reduced ongoing monitoring</li>
            </>
          )}
          {dueDiligenceLevel === dueDiligenceLevels.STANDARD && (
            <>
              <li>Full customer identification</li>
              <li>Beneficial ownership verification</li>
              <li>Regular ongoing monitoring</li>
            </>
          )}
          {dueDiligenceLevel === dueDiligenceLevels.ENHANCED && (
            <>
              <li>Enhanced customer information collection</li>
              <li>Source of wealth and funds verification</li>
              <li>Senior management approval required</li>
              <li>Enhanced ongoing monitoring</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div style={styles.reviewItem}>
      <div style={styles.reviewLabel}>{label}</div>
      <div style={styles.reviewValue}>{value}</div>
    </div>
  );
}

function isStepValid(step, formData) {
  if (step === 1) {
    return formData.client_name && formData.client_type && formData.purpose_of_relationship;
  }
  return true;
}

const styles = {
  container: {
    padding: '0',
    maxWidth: '100%',
    margin: '0'
  },
  sectionCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '2px solid #d4af37',
    padding: '32px',
    marginBottom: '32px'
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5568',
    margin: '4px 0 0 0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  },
  statTitle: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '8px',
    fontWeight: '600'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700'
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    borderBottom: '3px solid #d4af37',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    color: '#4a5568',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    marginBottom: '-3px',
    whiteSpace: 'nowrap',
    borderBottom: '3px solid transparent'
  },
  tabActive: {
    color: '#d4af37',
    borderBottom: '3px solid #d4af37',
    fontWeight: '700'
  },
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #d4af37',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '0.5px',
    borderBottom: '3px solid #d4af37',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)'
  },
  tr: {
    borderBottom: '1px solid #e8eaed',
    transition: 'background 0.2s ease'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#2d3748'
  },
  clientName: {
    fontWeight: '600',
    marginBottom: '2px',
    color: '#0a1929'
  },
  clientId: {
    fontSize: '12px',
    color: '#4a5568'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#f8f9fa',
    color: '#0a1929',
    border: '1px solid #d4af37'
  },
  riskBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  dateText: {
    fontSize: '13px',
    color: '#2d3748'
  },
  mutedText: {
    fontSize: '13px',
    color: '#718096'
  },
  actionButton: {
    padding: '6px 16px',
    background: 'transparent',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.3s ease'
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    transition: 'all 0.3s ease'
  },
  secondaryButton: {
    padding: '10px 24px',
    background: 'white',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '2px solid #d4af37',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '2px solid #d4af37',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#d4af37',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    transition: 'all 0.3s ease'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  modalFooter: {
    padding: '24px',
    borderTop: '2px solid #d4af37',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    background: '#f8f9fa'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2d3748',
    transition: 'border-color 0.2s ease'
  },
  helpText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic'
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2d3748',
    background: 'white',
    transition: 'border-color 0.2s ease'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#2d3748',
    cursor: 'pointer'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    marginTop: '24px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #d4af37'
  },
  reviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  reviewItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e8eaed'
  },
  reviewLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  reviewValue: {
    fontSize: '14px',
    color: '#0a1929',
    fontWeight: '600'
  },
  riskResultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  riskResultCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  riskResultLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  riskResultValue: {
    fontSize: '24px',
    fontWeight: '700'
  },
  infoBox: {
    background: '#fff9e6',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #d4af37',
    color: '#0a1929'
  },
  nextStepsList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px'
  }
};
