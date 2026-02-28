import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function NewUserRequestForm({ onClose, onSuccess }) {
  const { profile, organization } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    requested_access: 'staff',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.full_name || !formData.position || !formData.email || !formData.password || !formData.requested_access || !formData.reason) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Validate password strength
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      // Validate password confirmation
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Validate organization exists
      if (!organization || !organization.id) {
        setError('Organization information is missing. Please contact your administrator.');
        setLoading(false);
        return;
      }

      // Create the new user request (password will be auto-generated upon approval)
      const { data, error: insertError} = await supabase
        .from('new_user_requests')
        .insert([
          {
            full_name: formData.full_name,
            position: formData.position,
            email: formData.email,
            phone: formData.phone || null,
            requested_access: formData.requested_access,
            reason: formData.reason,
            organization_id: organization.id,
            organization_name: organization.name,
            status: 'pending',
            created_by: profile.id
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Success
      if (onSuccess) {
        onSuccess(data);
      }
      onClose();
    } catch (err) {
      console.error('Error creating new user request:', err);
      setError(err.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'white' }}>
            Add New Team Member
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          {error && (
            <div
              style={{
                padding: '16px',
                background: '#fee',
                border: '2px solid #fcc',
                borderRadius: '10px',
                color: '#c00',
                marginBottom: '24px',
                fontSize: '14px'
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Full Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
              placeholder="e.g., Sarah Johnson"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Position/Title <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
              placeholder="e.g., Senior Associate, Legal Assistant"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Email <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
              placeholder="sarah.johnson@lawfirm.com"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
              placeholder="+255 XXX XXX XXX"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
              placeholder="Minimum 8 characters"
            />
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              This will be the user's login password
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Confirm Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit'
              }}
              placeholder="Re-enter password"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Access Role <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              required
              value={formData.requested_access}
              onChange={(e) => setFormData({ ...formData, requested_access: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit',
                background: 'white'
              }}
            >
              <option value="staff">Staff Portal</option>
              <option value="compliance_officer">Compliance Portal</option>
            </select>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#0a1929',
                fontSize: '14px'
              }}
            >
              Reason for Access <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Explain why this person needs access and what their responsibilities will be..."
            />
          </div>

          <div
            style={{
              padding: '16px',
              background: '#f0f9ff',
              border: '2px solid #3b82f6',
              borderRadius: '10px',
              marginBottom: '24px'
            }}
          >
            <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
              <strong>Dual Approval Required:</strong> After you submit this request, one other Management user must approve it before the account can be created.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 32px',
                background: '#f1f5f9',
                color: '#64748b',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                opacity: loading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 32px',
                background: loading
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                color: 'white',
                border: '2px solid #d4af37',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
