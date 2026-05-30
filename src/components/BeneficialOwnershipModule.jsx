import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function BeneficialOwnershipModule({ matterId, onUpdate }) {
  const [owners, setOwners] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_type: 'individual',
    ownership_percentage: '',
    control_type: 'ownership',
    identity_document_type: 'passport',
    identity_document_number: '',
    identity_document_expiry: '',
    is_pep: false,
    pep_category: '',
    pep_position: '',
    residential_address: '',
    country_of_residence: '',
    nationality: '',
    verified: false,
    verification_date: '',
    verification_method: ''
  });

  useEffect(() => {
    if (matterId) {
      loadOwners();
    }
  }, [matterId]);

  const loadOwners = async () => {
    try {
      const { data, error } = await supabase
        .from('client_matters')
        .select('beneficial_owners')
        .eq('id', matterId)
        .single();

      if (error) throw error;
      setOwners(data?.beneficial_owners || []);
    } catch (error) {
      console.error('Error loading beneficial owners:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const ownerData = {
        ...formData,
        ownership_percentage: parseFloat(formData.ownership_percentage),
        id: editingOwner ? editingOwner.id : Date.now().toString()
      };

      let updatedOwners;
      if (editingOwner) {
        updatedOwners = owners.map(o =>
          o.id === editingOwner.id ? ownerData : o
        );
      } else {
        updatedOwners = [...owners, ownerData];
      }

      const { error } = await supabase
        .from('client_matters')
        .update({
          beneficial_owners: updatedOwners,
          beneficial_ownership_verified: updatedOwners.every(o => o.verified),
          ownership_structure_complex: updatedOwners.length > 3 ||
            updatedOwners.some(o => o.owner_type === 'corporate'),
          updated_at: new Date().toISOString()
        })
        .eq('id', matterId);

      if (error) throw error;

      alert(editingOwner ? 'Owner updated successfully' : 'Owner added successfully');
      resetForm();
      loadOwners();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving owner:', error);
      alert('Error saving owner: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      owner_name: '',
      owner_type: 'individual',
      ownership_percentage: '',
      control_type: 'ownership',
      identity_document_type: 'passport',
      identity_document_number: '',
      identity_document_expiry: '',
      is_pep: false,
      pep_category: '',
      pep_position: '',
      residential_address: '',
      country_of_residence: '',
      nationality: '',
      verified: false,
      verification_date: '',
      verification_method: ''
    });
    setEditingOwner(null);
    setShowForm(false);
  };

  const handleEdit = (owner) => {
    setFormData(owner);
    setEditingOwner(owner);
    setShowForm(true);
  };

  const handleDelete = async (ownerId) => {
    if (!confirm('Are you sure you want to delete this beneficial owner?')) return;

    try {
      const updatedOwners = owners.filter(o => o.id !== ownerId);

      const { error } = await supabase
        .from('client_matters')
        .update({
          beneficial_owners: updatedOwners,
          beneficial_ownership_verified: updatedOwners.every(o => o.verified),
          updated_at: new Date().toISOString()
        })
        .eq('id', matterId);

      if (error) throw error;

      alert('Owner deleted successfully');
      loadOwners();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting owner:', error);
      alert('Error deleting owner: ' + error.message);
    }
  };

  const getTotalOwnership = () => {
    return owners.reduce((sum, owner) => sum + (owner.ownership_percentage || 0), 0);
  };

  const isOwnershipComplete = () => {
    const total = getTotalOwnership();
    return total >= 25 && owners.length > 0;
  };

  const allOwnersVerified = () => {
    return owners.length > 0 && owners.every(o => o.verified);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Beneficial Ownership Verification</h2>
          <p style={styles.subtitle}>
            Identify all individuals who own or control ≥25% of the entity
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>
          + Add Owner
        </button>
      </div>

      {/* Ownership Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Total Ownership Identified</div>
          <div style={{
            ...styles.summaryValue,
            color: getTotalOwnership() >= 25 ? '#10b981' : '#ef4444'
          }}>
            {getTotalOwnership().toFixed(1)}%
          </div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Beneficial Owners</div>
          <div style={styles.summaryValue}>{owners.length}</div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Verification Status</div>
          <div style={{
            ...styles.summaryValue,
            color: allOwnersVerified() ? '#10b981' : '#f59e0b',
            fontSize: '16px'
          }}>
            {allOwnersVerified() ? 'Complete' : 'Incomplete'}
          </div>
        </div>
      </div>

      {/* Alert for incomplete ownership */}
      {!isOwnershipComplete() && (
        <div style={styles.alert}>
          <strong>⚠ Ownership Threshold Not Met:</strong> You must identify all individuals or
          entities controlling ≥25% ownership or voting rights.
        </div>
      )}

      {/* Owner Form Modal */}
      {showForm && (
        <div style={styles.modal} onClick={(e) => {
          if (e.target === e.currentTarget) resetForm();
        }}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {editingOwner ? 'Edit Beneficial Owner' : 'Add Beneficial Owner'}
            </h3>

            <form onSubmit={handleSubmit}>
              {/* Basic Information */}
              <div style={styles.formSection}>
                <h4 style={styles.formSectionTitle}>Basic Information</h4>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Owner Name *</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.row}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Owner Type *</label>
                    <select
                      value={formData.owner_type}
                      onChange={(e) => handleInputChange('owner_type', e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="individual">Individual</option>
                      <option value="corporate">Corporate Entity</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Ownership Percentage *</label>
                    <input
                      type="number"
                      value={formData.ownership_percentage}
                      onChange={(e) => handleInputChange('ownership_percentage', e.target.value)}
                      style={styles.input}
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Control Type *</label>
                  <select
                    value={formData.control_type}
                    onChange={(e) => handleInputChange('control_type', e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="ownership">Ownership</option>
                    <option value="voting_rights">Voting Rights</option>
                    <option value="board_appointment">Board Appointment Rights</option>
                    <option value="other">Other Control</option>
                  </select>
                </div>
              </div>

              {/* Identity Information */}
              {formData.owner_type === 'individual' && (
                <div style={styles.formSection}>
                  <h4 style={styles.formSectionTitle}>Identity Information</h4>

                  <div style={styles.row}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Document Type</label>
                      <select
                        value={formData.identity_document_type}
                        onChange={(e) => handleInputChange('identity_document_type', e.target.value)}
                        style={styles.select}
                      >
                        <option value="passport">Passport</option>
                        <option value="national_id">National ID</option>
                        <option value="drivers_license">Driver's License</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Document Number</label>
                      <input
                        type="text"
                        value={formData.identity_document_number}
                        onChange={(e) => handleInputChange('identity_document_number', e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Document Expiry Date</label>
                    <input
                      type="date"
                      value={formData.identity_document_expiry}
                      onChange={(e) => handleInputChange('identity_document_expiry', e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>
              )}

              {/* Address Information */}
              <div style={styles.formSection}>
                <h4 style={styles.formSectionTitle}>Address Information</h4>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Residential Address</label>
                  <textarea
                    value={formData.residential_address}
                    onChange={(e) => handleInputChange('residential_address', e.target.value)}
                    style={styles.textarea}
                    rows={3}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Country of Residence</label>
                  <input
                    type="text"
                    value={formData.country_of_residence}
                    onChange={(e) => handleInputChange('country_of_residence', e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* PEP Status */}
              {formData.owner_type === 'individual' && (
                <div style={styles.formSection}>
                  <h4 style={styles.formSectionTitle}>PEP Status</h4>

                  <div style={styles.checkboxGroup}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.is_pep}
                        onChange={(e) => handleInputChange('is_pep', e.target.checked)}
                        style={styles.checkbox}
                      />
                      <span>Is this person a Politically Exposed Person (PEP)?</span>
                    </label>
                  </div>

                  {formData.is_pep && (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>PEP Category</label>
                        <select
                          value={formData.pep_category}
                          onChange={(e) => handleInputChange('pep_category', e.target.value)}
                          style={styles.select}
                        >
                          <option value="">Select category...</option>
                          <option value="domestic">Domestic PEP</option>
                          <option value="foreign">Foreign PEP</option>
                          <option value="international_organization">International Organization</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>PEP Position/Role</label>
                        <input
                          type="text"
                          value={formData.pep_position}
                          onChange={(e) => handleInputChange('pep_position', e.target.value)}
                          style={styles.input}
                          placeholder="e.g., Minister of Finance, CEO of State Enterprise"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Verification */}
              <div style={styles.formSection}>
                <h4 style={styles.formSectionTitle}>Verification</h4>

                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.verified}
                      onChange={(e) => handleInputChange('verified', e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>Identity and ownership verified</span>
                  </label>
                </div>

                {formData.verified && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Verification Date</label>
                      <input
                        type="date"
                        value={formData.verification_date}
                        onChange={(e) => handleInputChange('verification_date', e.target.value)}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Verification Method</label>
                      <input
                        type="text"
                        value={formData.verification_method}
                        onChange={(e) => handleInputChange('verification_method', e.target.value)}
                        style={styles.input}
                        placeholder="e.g., Document verification, database check"
                      />
                    </div>
                  </>
                )}
              </div>

              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingOwner ? 'Update Owner' : 'Add Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owners List */}
      <div style={styles.ownersList}>
        {owners.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No beneficial owners added yet</p>
            <p style={styles.emptyHint}>
              Add all individuals or entities with ≥25% ownership or control
            </p>
          </div>
        ) : (
          owners.map(owner => (
            <div key={owner.id} style={styles.ownerCard}>
              <div style={styles.ownerHeader}>
                <div>
                  <h3 style={styles.ownerName}>{owner.owner_name}</h3>
                  <p style={styles.ownerType}>{owner.owner_type}</p>
                </div>
                <div style={styles.ownerBadges}>
                  <span style={{...styles.ownerBadge, backgroundColor: '#3b82f6'}}>
                    {owner.ownership_percentage}% {owner.control_type}
                  </span>
                  {owner.is_pep && (
                    <span style={{...styles.ownerBadge, backgroundColor: '#ef4444'}}>
                      PEP
                    </span>
                  )}
                  <span style={{
                    ...styles.ownerBadge,
                    backgroundColor: owner.verified ? '#10b981' : '#f59e0b'
                  }}>
                    {owner.verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>

              <div style={styles.ownerDetails}>
                {owner.nationality && (
                  <div style={styles.ownerDetailRow}>
                    <strong>Nationality:</strong> {owner.nationality}
                  </div>
                )}
                {owner.country_of_residence && (
                  <div style={styles.ownerDetailRow}>
                    <strong>Residence:</strong> {owner.country_of_residence}
                  </div>
                )}
                {owner.identity_document_number && (
                  <div style={styles.ownerDetailRow}>
                    <strong>ID:</strong> {owner.identity_document_type} - {owner.identity_document_number}
                  </div>
                )}
                {owner.is_pep && owner.pep_position && (
                  <div style={styles.ownerDetailRow}>
                    <strong>PEP Position:</strong> {owner.pep_position}
                  </div>
                )}
                {owner.verified && owner.verification_date && (
                  <div style={styles.ownerDetailRow}>
                    <strong>Verified:</strong> {new Date(owner.verification_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div style={styles.ownerActions}>
                <button onClick={() => handleEdit(owner)} style={styles.editButton}>
                  Edit
                </button>
                <button onClick={() => handleDelete(owner.id)} style={styles.deleteButton}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '5px'
  },
  addButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  summaryItem: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '6px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937'
  },
  alert: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    padding: '15px',
    fontSize: '14px',
    color: '#92400e',
    marginBottom: '20px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    overflowY: 'auto',
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '30px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#1f2937'
  },
  formSection: {
    marginBottom: '25px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  formSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#374151'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  checkboxGroup: {
    marginBottom: '15px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  checkbox: {
    marginRight: '8px',
    cursor: 'pointer'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '25px'
  },
  cancelButton: {
    padding: '10px 20px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    color: '#374151'
  },
  submitButton: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  ownersList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '15px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '2px dashed #d1d5db'
  },
  emptyHint: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '10px'
  },
  ownerCard: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px'
  },
  ownerHeader: {
    marginBottom: '15px'
  },
  ownerName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 5px 0'
  },
  ownerType: {
    fontSize: '13px',
    color: '#6b7280',
    textTransform: 'capitalize',
    margin: 0
  },
  ownerBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '10px'
  },
  ownerBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  ownerDetails: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '15px'
  },
  ownerDetailRow: {
    marginBottom: '6px'
  },
  ownerActions: {
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '15px'
  },
  editButton: {
    flex: 1,
    padding: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deleteButton: {
    flex: 1,
    padding: '8px',
    border: 'none',
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};
