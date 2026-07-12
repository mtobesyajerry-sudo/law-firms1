import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { dashboardStyles } from '../utils/dashboardStyles';
import LoadingSpinner from './LoadingSpinner';

const DomesticDesignationsAdmin = ({ organizationId }) => {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    designation_name: '',
    entity_type: 'individual',
    designation_basis: '',
    gazette_reference: '',
    effective_date: '',
    review_date: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    fetchDesignations();
  }, [organizationId]);

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('domestic_designations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDesignations(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      designation_name: '',
      entity_type: 'individual',
      designation_basis: '',
      gazette_reference: '',
      effective_date: '',
      review_date: '',
      status: 'active',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddClick = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditClick = (designation) => {
    setFormData({
      designation_name: designation.designation_name,
      entity_type: designation.entity_type,
      designation_basis: designation.designation_basis,
      gazette_reference: designation.gazette_reference,
      effective_date: designation.effective_date || '',
      review_date: designation.review_date || '',
      status: designation.status,
      notes: designation.notes || '',
    });
    setEditingId(designation.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError(null);

      if (editingId) {
        const { error: updateError } = await supabase
          .from('domestic_designations')
          .update(formData)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccessMessage('Designation updated successfully');
      } else {
        const { error: insertError } = await supabase
          .from('domestic_designations')
          .insert([
            {
              ...formData,
              organization_id: organizationId,
              created_by: 'admin',
            },
          ]);

        if (insertError) throw insertError;
        setSuccessMessage('Designation added successfully');
      }

      await fetchDesignations();
      resetForm();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelist = async (id) => {
    if (!window.confirm('Are you sure you want to delist this designation?')) {
      return;
    }

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('domestic_designations')
        .update({ status: 'delisted' })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccessMessage('Designation delisted successfully');
      await fetchDesignations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivate = async (id) => {
    if (!window.confirm('Are you sure you want to reactivate this designation?')) {
      return;
    }

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('domestic_designations')
        .update({ status: 'active' })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccessMessage('Designation reactivated successfully');
      await fetchDesignations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredDesignations = designations.filter((designation) => {
    const matchesStatus =
      statusFilter === 'all' || designation.status === statusFilter;
    const matchesSearch = designation.designation_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  const containerStyle = {
    padding: '24px',
    backgroundColor: '#0f1419',
    minHeight: '100vh',
  };

  const warningBannerStyle = {
    backgroundColor: '#d97706',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.5',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffd700',
  };

  const buttonStyle = {
    backgroundColor: '#ffd700',
    color: '#0f1419',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  };

  const filterBarStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const filterStyle = {
    backgroundColor: '#1a202c',
    color: '#ffffff',
    border: '1px solid #ffd700',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  };

  const searchStyle = {
    flex: 1,
    minWidth: '200px',
    backgroundColor: '#1a202c',
    color: '#ffffff',
    border: '1px solid #ffd700',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#1a202c',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
  };

  const theadStyle = {
    backgroundColor: '#2d3748',
    borderBottom: '2px solid #ffd700',
  };

  const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: '13px',
  };

  const tbodyTrStyle = {
    borderBottom: '1px solid #374151',
    transition: 'background-color 0.2s',
  };

  const tdStyle = {
    padding: '12px 16px',
    color: '#e5e7eb',
    fontSize: '13px',
  };

  const statusBadgeStyle = (status) => {
    let bgColor = '#374151';
    let textColor = '#e5e7eb';

    if (status === 'active') {
      bgColor = '#10b981';
      textColor = '#ffffff';
    } else if (status === 'delisted') {
      bgColor = '#ef4444';
      textColor = '#ffffff';
    } else if (status === 'under_review') {
      bgColor = '#f59e0b';
      textColor = '#ffffff';
    }

    return {
      display: 'inline-block',
      backgroundColor: bgColor,
      color: textColor,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
    };
  };

  const actionButtonStyle = {
    backgroundColor: '#ffd700',
    color: '#0f1419',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    marginRight: '6px',
    transition: 'opacity 0.2s',
  };

  const secondaryButtonStyle = {
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    marginRight: '6px',
    transition: 'opacity 0.2s',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: '#1a202c',
    border: '2px solid #ffd700',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.5)',
  };

  const formGroupStyle = {
    marginBottom: '16px',
  };

  const labelStyle = {
    display: 'block',
    color: '#ffd700',
    fontWeight: 'bold',
    marginBottom: '6px',
    fontSize: '14px',
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#0f1419',
    color: '#ffffff',
    border: '1px solid #ffd700',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    fontFamily: 'inherit',
    resize: 'vertical',
  };

  const formButtonGroupStyle = {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  };

  const messageStyle = (type) => ({
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: type === 'error' ? '#dc2626' : '#059669',
    color: '#ffffff',
  });

  return (
    <div style={containerStyle}>
      {error && <div style={messageStyle('error')}>{error}</div>}
      {successMessage && (
        <div style={messageStyle('success')}>{successMessage}</div>
      )}

      <div style={warningBannerStyle}>
        <strong>Verification Required:</strong> All entries must be manually
        verified against the current Tanzania Gazette. This list supplements but
        does not replace official Gazette verification.
      </div>

      <div style={headerStyle}>
        <h1 style={titleStyle}>Domestic Designations Management</h1>
        <button
          style={buttonStyle}
          onClick={handleAddClick}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#ffed4e')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffd700')}
        >
          + Add Designation
        </button>
      </div>

      <div style={filterBarStyle}>
        <select
          style={filterStyle}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="delisted">Delisted</option>
          <option value="under_review">Under Review</option>
        </select>

        <input
          style={searchStyle}
          type="text"
          placeholder="Search by designation name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <span style={{ color: '#ffd700', fontSize: '14px' }}>
          {filteredDesignations.length} result
          {filteredDesignations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Basis</th>
            <th style={thStyle}>Gazette Ref</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDesignations.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ ...tdStyle, textAlign: 'center', padding: '24px' }}>
                No designations found.
              </td>
            </tr>
          ) : (
            filteredDesignations.map((designation) => (
              <tr key={designation.id} style={tbodyTrStyle}>
                <td style={tdStyle}>{designation.designation_name}</td>
                <td style={tdStyle}>
                  {designation.entity_type === 'individual'
                    ? 'Individual'
                    : 'Entity'}
                </td>
                <td style={tdStyle}>{designation.designation_basis}</td>
                <td style={tdStyle}>{designation.gazette_reference}</td>
                <td style={tdStyle}>
                  <span style={statusBadgeStyle(designation.status)}>
                    {designation.status.charAt(0).toUpperCase() +
                      designation.status.slice(1).replace('_', ' ')}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button
                    style={actionButtonStyle}
                    onClick={() => handleEditClick(designation)}
                    onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                    onMouseLeave={(e) => (e.target.style.opacity = '1')}
                  >
                    Edit
                  </button>
                  {designation.status === 'active' && (
                    <button
                      style={secondaryButtonStyle}
                      onClick={() => handleDelist(designation.id)}
                      onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.target.style.opacity = '1')}
                    >
                      Delist
                    </button>
                  )}
                  {designation.status === 'delisted' && (
                    <button
                      style={secondaryButtonStyle}
                      onClick={() => handleReactivate(designation.id)}
                      onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.target.style.opacity = '1')}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showForm && (
        <div style={modalOverlayStyle} onClick={resetForm}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>
              {editingId ? 'Edit Designation' : 'Add New Designation'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Designation Name *</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="designation_name"
                  value={formData.designation_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., AL-SHABAAB"
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Entity Type *</label>
                <select
                  style={inputStyle}
                  name="entity_type"
                  value={formData.entity_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="individual">Individual</option>
                  <option value="entity">Entity</option>
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Designation Basis *</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="designation_basis"
                  value={formData.designation_basis}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., UN Security Council Resolution"
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Gazette Reference *</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="gazette_reference"
                  value={formData.gazette_reference}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Gazette No. 45/2023"
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Effective Date</label>
                <input
                  style={inputStyle}
                  type="date"
                  name="effective_date"
                  value={formData.effective_date}
                  onChange={handleInputChange}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Review Date</label>
                <input
                  style={inputStyle}
                  type="date"
                  name="review_date"
                  value={formData.review_date}
                  onChange={handleInputChange}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Status *</label>
                <select
                  style={inputStyle}
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="active">Active</option>
                  <option value="delisted">Delisted</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={textareaStyle}
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional information or context..."
                />
              </div>

              <div style={formButtonGroupStyle}>
                <button
                  type="submit"
                  style={buttonStyle}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#ffed4e')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffd700')}
                >
                  {editingId ? 'Update Designation' : 'Add Designation'}
                </button>
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6b7280',
                    color: '#ffffff',
                  }}
                  onClick={resetForm}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#9ca3af')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#6b7280')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomesticDesignationsAdmin;
