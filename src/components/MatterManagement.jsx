import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import MatterDetailView from './MatterDetailView';

export default function MatterManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [matters, setMatters] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMatterModal, setShowNewMatterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isReadOnly = profile?.role === 'management' || profile?.role === 'compliance_officer' || profile?.role === 'mlro';

  // Restore selected matter and tab from URL on mount
  useEffect(() => {
    const matterId = searchParams.get('matterId');
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'clients', 'activities', 'milestones', 'billing', 'documents'].includes(tab)) {
      setDetailTab(tab);
    }
    if (matterId && matters.length > 0) {
      const matter = matters.find(m => m.id === matterId);
      if (matter) {
        setSelectedMatter(matter);
      }
    }
  }, [matters]);

  const matterTypes = [
    { value: 'litigation', label: 'Litigation' },
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

  const serviceCategories = [
    { value: 'advisory', label: 'Advisory' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'litigation', label: 'Litigation' },
    { value: 'compliance', label: 'Compliance' }
  ];

  // Helper to open matter detail and update URL
  const openMatterDetail = (matter, tab = 'overview') => {
    setSelectedMatter(matter);
    setDetailTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('matterId', matter.id);
    if (tab !== 'overview') {
      params.set('tab', tab);
    } else {
      params.delete('tab');
    }
    setSearchParams(params);
  };

  // Helper to close matter detail and clear URL
  const closeMatterDetail = () => {
    setSelectedMatter(null);
    setDetailTab('overview');
    const params = new URLSearchParams(searchParams);
    params.delete('matterId');
    params.delete('tab');
    setSearchParams(params);
  };

  // Helper to change tab and update URL
  const changeDetailTab = (tab) => {
    setDetailTab(tab);
    const params = new URLSearchParams(searchParams);
    if (tab !== 'overview') {
      params.set('tab', tab);
    } else {
      params.delete('tab');
    }
    setSearchParams(params);
  };

  useEffect(() => {
    if (profile) {
      if (profile.role === 'admin') {
        return;
      }
      if (profile.organization_id) {
        loadMatters();
        loadClients();
        loadStaffMembers();
      }
    }
  }, [profile]);

  const loadMatters = async () => {
    try {
      let query = supabase
        .from('matters')
        .select(`
          *,
          client_matter_relationships (
            client_id,
            relationship_type,
            kyc_clients (
              id,
              client_name,
              current_risk_rating
            )
          )
        `)
        .eq('organization_id', profile.organization_id);

      if (profile.role === 'staff') {
        query = query.eq('responsible_lawyer_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setMatters(data || []);
    } catch (error) {
      console.error('Error loading matters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      let query = supabase
        .from('kyc_clients_decrypted')
        .select('id, client_name, client_type')
        .eq('organization_id', profile.organization_id);

      if (profile.role === 'staff') {
        query = query.eq('relationship_manager_id', user.id);
      }

      const { data, error } = await query.order('client_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadStaffMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role')
        .eq('organization_id', profile.organization_id)
        .in('role', ['staff', 'management', 'compliance_officer'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error loading staff members:', error);
    }
  };

  const getAMLAlert = (matter) => {
    if (matter.risk_level === 'high') {
      return { show: true, reason: 'High Risk Matter', priority: 'critical' };
    }
    if (matter.involves_cross_border && matter.involves_high_risk_jurisdiction) {
      return { show: true, reason: 'Cross-Border + High Risk Jurisdiction', priority: 'critical' };
    }
    if (matter.involves_cross_border) {
      return { show: true, reason: 'Cross-Border Transaction', priority: 'high' };
    }
    if (matter.involves_high_risk_jurisdiction) {
      return { show: true, reason: 'High Risk Jurisdiction', priority: 'high' };
    }
    if (matter.aml_trigger_activities?.length >= 2) {
      return { show: true, reason: 'Multiple AML Triggers', priority: 'high' };
    }
    if (matter.involves_client_account) {
      return { show: true, reason: 'Client Account Handling', priority: 'medium' };
    }
    return { show: false, reason: '', priority: '' };
  };

  const filteredMatters = matters.filter(matter => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return matter.status === 'open' || matter.status === 'active';
    if (activeTab === 'high_risk') return matter.risk_level === 'high' || matter.risk_level === 'very_high';
    if (activeTab === 'cross_border') return matter.involves_cross_border === true;
    if (activeTab === 'aml_triggers') return matter.aml_trigger_activities?.length > 0;
    if (activeTab === 'closed') return matter.status === 'closed';
    return true;
  });

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (profile?.role === 'admin') {
    return (
      <div style={styles.container}>
        <div style={styles.sectionCard}>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' }}>
              Matter Management
            </h2>
            <p style={{ color: '#718096', fontSize: '16px' }}>
              Admin users view matters through the Admin Dashboard.
            </p>
            <p style={{ color: '#718096', fontSize: '14px', marginTop: '16px' }}>
              To manage matters for a specific organization, please log in with a staff or management account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile?.organization_id) {
    return (
      <div style={styles.container}>
        <div style={styles.sectionCard}>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' }}>
              No Organization Assigned
            </h2>
            <p style={{ color: '#718096', fontSize: '16px' }}>
              Please contact your administrator to be assigned to an organization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionCard}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Matter Management</h2>
            <p style={styles.subtitle}>Legal matter tracking and compliance monitoring</p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setShowNewMatterModal(true)}
              style={styles.primaryButton}
            >
              + Add New Matter
            </button>
          )}
        </div>

        <div style={styles.statsGrid}>
          <StatCard
            title="Total Matters"
            value={matters.length}
            color="#0a1929"
          />
          <StatCard
            title="Open Matters"
            value={matters.filter(m => m.status === 'open' || m.status === 'active').length}
            color="#10b981"
          />
          <StatCard
            title="High Risk Matters"
            value={matters.filter(m => m.risk_level === 'high' || m.risk_level === 'very_high').length}
            color="#ef4444"
          />
          <StatCard
            title="AML Triggers"
            value={matters.filter(m => m.aml_trigger_activities?.length > 0).length}
            color="#d4af37"
          />
        </div>

        <div style={styles.tabs}>
          <TabButton
            label={`All Matters (${matters.length})`}
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          />
          <TabButton
            label={`Open (${matters.filter(m => m.status === 'open' || m.status === 'active').length})`}
            active={activeTab === 'open'}
            onClick={() => setActiveTab('open')}
          />
          <TabButton
            label={`High Risk (${matters.filter(m => m.risk_level === 'high' || m.risk_level === 'very_high').length})`}
            active={activeTab === 'high_risk'}
            onClick={() => setActiveTab('high_risk')}
          />
          <TabButton
            label={`Cross-Border (${matters.filter(m => m.involves_cross_border).length})`}
            active={activeTab === 'cross_border'}
            onClick={() => setActiveTab('cross_border')}
          />
          <TabButton
            label={`AML Triggers (${matters.filter(m => m.aml_trigger_activities?.length > 0).length})`}
            active={activeTab === 'aml_triggers'}
            onClick={() => setActiveTab('aml_triggers')}
          />
          <TabButton
            label={`Closed (${matters.filter(m => m.status === 'closed').length})`}
            active={activeTab === 'closed'}
            onClick={() => setActiveTab('closed')}
          />
        </div>

        <div style={styles.tableContainer}>
          {filteredMatters.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No matters found. Add your first matter to get started.</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Matter Name</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Matter Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Risk Level</th>
                  <th style={styles.th}>AML Triggers</th>
                  <th style={styles.th}>Opened Date</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatters.map(matter => {
                  const primaryClient = matter.client_matter_relationships?.find(
                    rel => rel.relationship_type === 'primary_client'
                  );
                  const amlActivitiesCount = matter.aml_trigger_activities?.length || 0;
                  const amlAlert = getAMLAlert(matter);

                  return (
                    <tr key={matter.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div>
                          <div style={styles.matterName}>{matter.matter_name}</div>
                          {matter.matter_number && (
                            <div style={styles.matterNumber}>{matter.matter_number}</div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {primaryClient?.kyc_clients?.client_name ? (
                          <div>
                            <div style={styles.clientName}>
                              {primaryClient.kyc_clients.client_name}
                            </div>
                            {primaryClient.kyc_clients.current_risk_rating && (
                              <span style={{
                                ...styles.riskBadge,
                                backgroundColor: getRiskColor(primaryClient.kyc_clients.current_risk_rating) + '20',
                                color: getRiskColor(primaryClient.kyc_clients.current_risk_rating),
                                fontSize: '11px',
                                padding: '2px 8px'
                              }}>
                                {primaryClient.kyc_clients.current_risk_rating}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={styles.mutedText}>No client</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badge}>
                          {matterTypes.find(t => t.value === matter.matter_type)?.label || matter.matter_type}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <StatusBadge status={matter.status} />
                      </td>
                      <td style={styles.td}>
                        {matter.risk_level ? (
                          <span style={{
                            ...styles.riskBadge,
                            backgroundColor: getRiskColor(matter.risk_level) + '20',
                            color: getRiskColor(matter.risk_level)
                          }}>
                            {matter.risk_level.replace('_', ' ')}
                          </span>
                        ) : (
                          <span style={styles.mutedText}>Not assessed</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {amlActivitiesCount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              ...styles.riskBadge,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              fontWeight: '600'
                            }}>
                              {amlActivitiesCount} trigger{amlActivitiesCount > 1 ? 's' : ''}
                            </span>
                            {amlAlert.show && (
                              <span style={{
                                fontSize: '11px',
                                color: amlAlert.priority === 'critical' ? '#991b1b' : '#92400e',
                                fontWeight: '600'
                              }}>
                                🚨 {amlAlert.priority}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={styles.mutedText}>None</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {matter.opened_date ? (
                          <span style={styles.dateText}>
                            {new Date(matter.opened_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={styles.mutedText}>Not set</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => openMatterDetail(matter)}
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

        {showNewMatterModal && (
          <NewMatterModal
            onClose={() => setShowNewMatterModal(false)}
            onSuccess={() => {
              setShowNewMatterModal(false);
              loadMatters();
            }}
            organizationId={profile.organization_id}
            userId={user.id}
            clients={clients}
            staffMembers={staffMembers}
            userProfile={profile}
            matterTypes={matterTypes}
            serviceCategories={serviceCategories}
          />
        )}
      </div>

      {selectedMatter && (
        <MatterDetailView
          matter={selectedMatter}
          onClose={closeMatterDetail}
          activeTab={detailTab}
          onTabChange={changeDetailTab}
        />
      )}
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
    open: { label: 'Open', bg: '#dbeafe', color: '#1e40af' },
    active: { label: 'Active', bg: '#d1fae5', color: '#065f46' },
    on_hold: { label: 'On Hold', bg: '#fef3c7', color: '#92400e' },
    closed: { label: 'Closed', bg: '#e5e7eb', color: '#374151' },
    conflict_pending: { label: 'Conflict Pending', bg: '#fee2e2', color: '#991b1b' }
  };

  const config = statusConfig[status] || statusConfig.open;

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

function getRiskColor(riskLevel) {
  const colors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    very_high: '#dc2626'
  };
  return colors[riskLevel] || '#64748b';
}

function NewMatterModal({ onClose, onSuccess, organizationId, userId, clients, staffMembers, userProfile, matterTypes, serviceCategories }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    matter_name: '',
    matter_type: 'litigation',
    service_category: 'advisory',
    matter_description: '',
    status: 'open',
    responsible_lawyer_id: userId,
    estimated_value: '',
    currency: 'TZS',
    involves_client_account: false,
    involves_cross_border: false,
    involves_high_risk_jurisdiction: false,
    client_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Map matter_type to AML trigger activities
      const matterTypeToAMLTrigger = {
        'real_property_transaction': ['real_property_transaction'],
        'commercial_enterprise_transaction': ['commercial_enterprise_transaction'],
        'client_funds_management': ['client_funds_management'],
        'bank_account_management': ['bank_account_management'],
        'corporation_capital_organization': ['corporation_capital_organization'],
        'entity_creation_management': ['entity_creation_management'],
        'business_entity_transaction': ['business_entity_transaction'],
        'financial_transaction_representation': ['financial_transaction_representation'],
        'real_estate_transaction_representation': ['real_estate_transaction_representation'],
        'litigation': [] // Litigation doesn't trigger AML obligations by itself
      };

      const amlTriggers = matterTypeToAMLTrigger[formData.matter_type] || [];

      const matterData = {
        ...formData,
        organization_id: organizationId,
        created_by: userId,
        matter_number: `MTR-${Date.now()}`,
        opened_date: new Date().toISOString().split('T')[0],
        // Convert empty strings to null for numeric fields
        estimated_value: formData.estimated_value === '' ? null : parseFloat(formData.estimated_value) || null,
        // Automatically set AML trigger activities based on matter type
        aml_trigger_activities: amlTriggers
      };

      const clientId = formData.client_id;
      delete matterData.client_id;

      const { data: newMatter, error } = await supabase
        .from('matters')
        .insert([matterData])
        .select()
        .single();

      if (error) throw error;

      if (clientId && newMatter.id) {
        const { error: relError } = await supabase
          .from('client_matter_relationships')
          .insert([{
            client_id: clientId,
            matter_id: newMatter.id,
            relationship_type: 'primary'
          }]);

        if (relError) {
          console.error('Error creating client relationship:', relError);
          alert('Warning: Matter created but client relationship failed: ' + relError.message);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating matter:', error);
      alert('Error creating matter: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Add New Matter - Step {step} of 2</h3>
          <button onClick={onClose} style={styles.closeButton}>&times;</button>
        </div>

        <div style={styles.modalBody}>
          {step === 1 && (
            <BasicInformationStep
              formData={formData}
              onChange={setFormData}
              clients={clients}
              matterTypes={matterTypes}
              serviceCategories={serviceCategories}
            />
          )}

          {step === 2 && (
            <AdditionalDetailsStep
              formData={formData}
              onChange={setFormData}
              staffMembers={staffMembers}
              userProfile={userProfile}
              userId={userId}
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
          {step < 2 ? (
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
              {submitting ? 'Creating...' : 'Create Matter'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicInformationStep({ formData, onChange, clients, matterTypes, serviceCategories }) {
  return (
    <div style={styles.formSection}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Matter Name*</label>
        <input
          type="text"
          value={formData.matter_name}
          onChange={(e) => onChange({...formData, matter_name: e.target.value})}
          style={styles.input}
          placeholder="Enter matter name"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Client*</label>
        <select
          value={formData.client_id}
          onChange={(e) => onChange({...formData, client_id: e.target.value})}
          style={styles.select}
        >
          <option value="">Select a client...</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.client_name} ({client.client_type})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚖️</span>
            AML/CTF/CPF Trigger Activities (Tanzania Law)*
          </span>
        </label>
        <select
          value={formData.matter_type}
          onChange={(e) => onChange({...formData, matter_type: e.target.value})}
          style={styles.select}
        >
          {matterTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <span style={styles.helpText}>
          Select the activity that triggers AML/CTF/CPF compliance obligations for this matter
        </span>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Service Category*</label>
        <select
          value={formData.service_category}
          onChange={(e) => onChange({...formData, service_category: e.target.value})}
          style={styles.select}
        >
          {serviceCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Matter Description</label>
        <textarea
          value={formData.matter_description}
          onChange={(e) => onChange({...formData, matter_description: e.target.value})}
          style={{...styles.input, minHeight: '80px'}}
          placeholder="Describe the matter..."
        />
      </div>
    </div>
  );
}

function AdditionalDetailsStep({ formData, onChange, staffMembers, userProfile, userId }) {
  return (
    <div style={styles.formSection}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Responsible Lawyer*</label>
        <select
          value={formData.responsible_lawyer_id}
          onChange={(e) => onChange({...formData, responsible_lawyer_id: e.target.value})}
          style={styles.select}
        >
          <option value={userId}>Myself ({userProfile.full_name})</option>
          {staffMembers.filter(s => s.id !== userId).map(staff => (
            <option key={staff.id} value={staff.id}>
              {staff.full_name} ({staff.role})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Status</label>
        <select
          value={formData.status}
          onChange={(e) => onChange({...formData, status: e.target.value})}
          style={styles.select}
        >
          <option value="open">Open</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="closed">Closed</option>
          <option value="conflict_pending">Conflict Pending</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Estimated Value</label>
        <input
          type="number"
          value={formData.estimated_value}
          onChange={(e) => onChange({...formData, estimated_value: e.target.value})}
          style={styles.input}
          placeholder="0.00"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Currency</label>
        <select
          value={formData.currency}
          onChange={(e) => onChange({...formData, currency: e.target.value})}
          style={styles.select}
        >
          <option value="TZS">TZS</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.involves_client_account}
            onChange={(e) => onChange({...formData, involves_client_account: e.target.checked})}
            style={styles.checkbox}
          />
          Involves Client Account
        </label>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.involves_cross_border}
            onChange={(e) => onChange({...formData, involves_cross_border: e.target.checked})}
            style={styles.checkbox}
          />
          Cross-Border Transaction
        </label>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.involves_high_risk_jurisdiction}
            onChange={(e) => onChange({...formData, involves_high_risk_jurisdiction: e.target.checked})}
            style={styles.checkbox}
          />
          High-Risk Jurisdiction
        </label>
      </div>
    </div>
  );
}

function isStepValid(step, formData) {
  if (step === 1) {
    return formData.matter_name && formData.client_id && formData.matter_type;
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
  matterName: {
    fontWeight: '600',
    marginBottom: '2px',
    color: '#0a1929'
  },
  matterNumber: {
    fontSize: '12px',
    color: '#4a5568'
  },
  clientName: {
    fontWeight: '500',
    marginBottom: '4px',
    color: '#0a1929'
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
  select: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#2d3748',
    background: 'white',
    transition: 'border-color 0.2s ease'
  },
  helpText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic'
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
  }
};
