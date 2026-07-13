import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { fmtDateShort } from '../utils/dateFormat';

export default function MatterBillingMilestones({ matterId, organizationId, onBillingAdded, isReadOnly = false }) {
  const [billingMilestones, setBillingMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    milestone_type: 'retainer_received',
    milestone_name: '',
    milestone_date: '',
    amount: '',
    currency: 'TZS',
    payment_status: 'pending',
    payment_method: '',
    invoice_number: '',
    involves_client_account: false,
    requires_aml_review: false,
    notes: ''
  });

  const milestoneTypes = [
    { value: 'retainer_received', label: 'Retainer Received' },
    { value: 'initial_payment', label: 'Initial Payment' },
    { value: 'phase_completed', label: 'Phase Completed' },
    { value: 'milestone_payment', label: 'Milestone Payment' },
    { value: 'progress_billing', label: 'Progress Billing' },
    { value: 'expense_reimbursement', label: 'Expense Reimbursement' },
    { value: 'final_billing', label: 'Final Billing' },
    { value: 'matter_closed', label: 'Matter Closed' },
    { value: 'payment_plan_installment', label: 'Payment Plan Installment' },
    { value: 'refund_issued', label: 'Refund Issued' }
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'received', label: 'Received' },
    { value: 'partially_received', label: 'Partially Received' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' }
  ];

  const paymentMethods = [
    { value: '', label: 'Not Specified' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'cash', label: 'Cash' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'wire_transfer', label: 'Wire Transfer' },
    { value: 'other', label: 'Other' }
  ];

  const currencies = [
    { value: 'TZS', label: 'TZS (Tanzanian Shilling)' },
    { value: 'USD', label: 'USD (US Dollar)' },
    { value: 'EUR', label: 'EUR (Euro)' },
    { value: 'GBP', label: 'GBP (British Pound)' },
    { value: 'KES', label: 'KES (Kenyan Shilling)' },
    { value: 'UGX', label: 'UGX (Ugandan Shilling)' }
  ];

  useEffect(() => {
    if (matterId) {
      fetchBillingMilestones();
    }
  }, [matterId]);

  const fetchBillingMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('matter_billing_milestones')
        .select('*')
        .eq('matter_id', matterId)
        .order('milestone_date', { ascending: false });

      if (error) throw error;
      setBillingMilestones(data || []);
    } catch (error) {
      console.error('Error fetching billing milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.milestone_name.trim() || !formData.milestone_date || !formData.amount) {
      alert('Please enter milestone name, date, and amount');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const billingData = {
        organization_id: organizationId,
        matter_id: matterId,
        milestone_type: formData.milestone_type,
        milestone_name: formData.milestone_name.trim(),
        milestone_date: formData.milestone_date,
        amount: amount,
        currency: formData.currency,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method || null,
        invoice_number: formData.invoice_number.trim() || null,
        involves_client_account: formData.involves_client_account,
        requires_aml_review: formData.requires_aml_review,
        notes: formData.notes.trim() || null,
        created_by: user.id
      };

      const { error } = await supabase
        .from('matter_billing_milestones')
        .insert([billingData]);

      if (error) throw error;

      setFormData({
        milestone_type: 'retainer_received',
        milestone_name: '',
        milestone_date: '',
        amount: '',
        currency: 'TZS',
        payment_status: 'pending',
        payment_method: '',
        invoice_number: '',
        involves_client_account: false,
        requires_aml_review: false,
        notes: ''
      });
      setShowForm(false);
      fetchBillingMilestones();
      if (onBillingAdded) onBillingAdded();
    } catch (error) {
      console.error('Error adding billing milestone:', error);
      alert('Failed to add billing milestone');
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'partially_received': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'refunded': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTotalBilled = () => {
    return billingMilestones
      .filter(b => b.payment_status !== 'cancelled' && b.payment_status !== 'refunded')
      .reduce((sum, b) => {
        if (b.currency === 'TZS') {
          return sum + parseFloat(b.amount);
        }
        return sum;
      }, 0);
  };

  const getTotalReceived = () => {
    return billingMilestones
      .filter(b => b.payment_status === 'received')
      .reduce((sum, b) => {
        if (b.currency === 'TZS') {
          return sum + parseFloat(b.amount);
        }
        return sum;
      }, 0);
  };

  if (loading) {
    return <div className="text-center py-4">Loading billing information...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerSection}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrapper}>
              <span style={styles.icon}>💰</span>
            </div>
            <div>
              <h3 style={styles.headerTitle}>Billing & Payments</h3>
              <p style={styles.headerSubtitle}>Track all billing milestones, payments, and financial activities</p>
            </div>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setShowForm(!showForm)}
              style={showForm ? styles.cancelButton : styles.addButton}
            >
              {showForm ? '✕ Cancel' : '+ Add Billing Milestone'}
            </button>
          )}
        </div>

        {billingMilestones.length > 0 && (
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Billed (TZS)</div>
              <div style={styles.summaryValueBilled}>
                {formatAmount(getTotalBilled(), 'TZS')}
              </div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Received (TZS)</div>
              <div style={styles.summaryValueReceived}>
                {formatAmount(getTotalReceived(), 'TZS')}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          <div style={styles.formGrid}>
            {/* Basic Information Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>💰</span>
                Basic Information
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Milestone Type <span style={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.milestone_type}
                      onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value })}
                      style={styles.input}
                      required
                    >
                      {milestoneTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Milestone Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.milestone_name}
                      onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., Q1 2024 Retainer"
                      required
                    />
                  </div>
                </div>

                <div style={styles.formField}>
                  <label style={styles.label}>
                    Date <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.milestone_date}
                    onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Details Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>💵</span>
                Payment Details
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Amount <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      style={styles.input}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Currency <span style={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      style={styles.input}
                      required
                    >
                      {currencies.map(curr => (
                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Payment Status</label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                      style={styles.input}
                    >
                      {paymentStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      style={styles.input}
                    >
                      {paymentMethods.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>📄</span>
                Invoice Details
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formField}>
                  <label style={styles.label}>Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    style={styles.input}
                    placeholder="INV-2024-001"
                  />
                </div>
              </div>
            </div>

            {/* AML Compliance Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>⚠️</span>
                AML Compliance Flags
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.checkboxGrid}>
                  <div style={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.involves_client_account}
                      onChange={(e) => setFormData({ ...formData, involves_client_account: e.target.checked })}
                      style={styles.checkbox}
                      id="involvesClientAccount"
                    />
                    <label htmlFor="involvesClientAccount" style={styles.checkboxLabel}>
                      <strong>Involves Client Account</strong> - Funds held in law firm client account
                    </label>
                  </div>

                  <div style={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.requires_aml_review}
                      onChange={(e) => setFormData({ ...formData, requires_aml_review: e.target.checked })}
                      style={styles.checkbox}
                      id="requiresAmlReview"
                    />
                    <label htmlFor="requiresAmlReview" style={styles.checkboxLabel}>
                      <strong>Requires AML Review</strong> - Manual AML compliance review needed
                    </label>
                  </div>
                </div>

                <div style={styles.amlNotice}>
                  <div style={styles.amlNoticeIcon}>ℹ️</div>
                  <div style={styles.amlNoticeText}>
                    <strong>Note:</strong> Large transactions (≥10M TZS, ≥$10k USD/EUR) are automatically flagged for AML review
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>📝</span>
                Additional Notes
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formFieldFull}>
                  <label style={styles.label}>Notes (max 1000 characters)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="4"
                    maxLength="1000"
                    style={styles.textarea}
                    placeholder="Optional additional context, payment terms, or important details..."
                  />
                  <div style={styles.charCount}>
                    {formData.notes.length} / 1000 characters
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={styles.cancelButtonAlt}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.submitButton}
              >
                <span style={styles.submitButtonIcon}>✓</span>
                Add Billing Milestone
              </button>
            </div>
          </div>
        </form>
      )}

      <div style={styles.contentSection}>
        {billingMilestones.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💰</div>
            <p style={styles.emptyText}>No billing milestones recorded</p>
            <p style={styles.emptySubtext}>Start tracking payments and billing for this matter</p>
          </div>
        ) : (
          <div style={styles.billingList}>
            {billingMilestones.map((billing) => (
              <div key={billing.id} style={styles.billingCard}>
                <div style={styles.billingHeader}>
                  <div style={styles.billingTitle}>
                    <span style={styles.billingTypeName}>
                      {milestoneTypes.find(t => t.value === billing.milestone_type)?.label || billing.milestone_type}
                    </span>
                    <div style={styles.billingBadges}>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getPaymentStatusColor(billing.payment_status)}`}>
                        {billing.payment_status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <span style={styles.billingDate}>
                    {fmtDateShort(billing.milestone_date)}
                  </span>
                </div>

                <div style={styles.billingBody}>
                  <div style={styles.billingNameSection}>
                    <span style={styles.billingLabel}>Description</span>
                    <span style={styles.billingNameText}>{billing.milestone_name}</span>
                  </div>

                  <div style={styles.billingAmountSection}>
                    <span style={styles.billingLabel}>Amount</span>
                    <span style={styles.billingAmountValue}>
                      {formatAmount(billing.amount, billing.currency)}
                    </span>
                  </div>

                  {(billing.invoice_number || billing.payment_method) && (
                    <div style={styles.billingDetailsGrid}>
                      {billing.invoice_number && (
                        <div style={styles.billingDetailItem}>
                          <span style={styles.billingLabel}>Invoice Number</span>
                          <span style={styles.billingDetailValue}>{billing.invoice_number}</span>
                        </div>
                      )}
                      {billing.payment_method && (
                        <div style={styles.billingDetailItem}>
                          <span style={styles.billingLabel}>Payment Method</span>
                          <span style={styles.billingDetailValue}>
                            {paymentMethods.find(m => m.value === billing.payment_method)?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {(billing.involves_client_account || billing.requires_aml_review) && (
                    <div style={styles.billingFlags}>
                      <span style={styles.billingLabel}>Compliance Flags</span>
                      <div style={styles.billingFlagsList}>
                        {billing.involves_client_account && (
                          <span style={styles.clientAccountFlag}>Client Account</span>
                        )}
                        {billing.requires_aml_review && (
                          <span style={styles.amlReviewFlag}>AML Review Required</span>
                        )}
                      </div>
                    </div>
                  )}

                  {billing.notes && (
                    <div style={styles.billingNotesSection}>
                      <span style={styles.billingLabel}>Notes</span>
                      <p style={styles.billingNotesText}>{billing.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const getAMLThreshold = (amount, currency) => {
  const thresholds = {
    'TZS': 10000000,
    'USD': 10000,
    'EUR': 10000,
    'GBP': 8000,
    'KES': 1000000,
    'UGX': 38000000
  };
  return amount >= (thresholds[currency] || 10000);
};

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  headerSection: {
    padding: '24px',
    borderBottom: '2px solid #d4af37',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
  },
  icon: {
    fontSize: '24px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  addButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
  },
  cancelButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#dc2626',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  summaryCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  summaryValueBilled: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
  },
  summaryValueReceived: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#059669',
  },
  formContainer: {
    padding: '32px',
    background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
    borderBottom: '2px solid #d4af37',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formSection: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  formSectionTitle: {
    margin: 0,
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    borderBottom: '2px solid #d4af37',
    fontSize: '15px',
    fontWeight: '700',
    color: '#0a1929',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  formSectionIcon: {
    fontSize: '18px',
  },
  formSectionContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formFieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    letterSpacing: '0.3px',
  },
  required: {
    color: '#dc2626',
    fontWeight: '700',
  },
  input: {
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1f2937',
    background: 'white',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  textarea: {
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1f2937',
    background: 'white',
    transition: 'all 0.3s ease',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '12px',
  },
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.6',
    cursor: 'pointer',
  },
  amlNotice: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
  },
  amlNoticeIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  amlNoticeText: {
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: '1.6',
  },
  charCount: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
    fontWeight: '500',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '8px',
  },
  cancelButtonAlt: {
    padding: '12px 32px',
    background: 'white',
    color: '#6b7280',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  submitButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  submitButtonIcon: {
    fontSize: '16px',
  },
  contentSection: {
    padding: '24px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '2px dashed #d1d5db',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  billingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  billingCard: {
    padding: '24px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #10b981',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
  },
  billingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f3f4f6',
  },
  billingTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  billingTypeName: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0a1929',
    lineHeight: '1.4',
  },
  billingBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  billingDate: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    color: '#4b5563',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    whiteSpace: 'nowrap',
  },
  billingBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  billingNameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  billingNameText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    lineHeight: '1.5',
  },
  billingAmountSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    borderRadius: '8px',
    border: '1px solid #6ee7b7',
  },
  billingAmountValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#065f46',
    letterSpacing: '-0.5px',
  },
  billingDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  billingDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  billingDetailValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  billingFlags: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  billingFlagsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  billingLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  clientAccountFlag: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    color: '#92400e',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  amlReviewFlag: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
    color: '#7c2d12',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #fb923c',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  billingNotesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
  },
  billingNotesText: {
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic',
  },
};
