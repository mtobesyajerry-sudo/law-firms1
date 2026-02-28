import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SubscriptionManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [orgsResult, plansResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
      ]);

      if (orgsResult.error) throw orgsResult.error;
      if (plansResult.error) throw plansResult.error;

      setOrganizations(orgsResult.data || []);
      setSubscriptionPlans(plansResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading subscription data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: { bg: '#d1fae5', color: '#065f46' },
      expired: { bg: '#fee2e2', color: '#991b1b' },
      suspended: { bg: '#fef3c7', color: '#92400e' },
      cancelled: { bg: '#f1f5f9', color: '#475569' }
    };
    return colors[status] || colors.cancelled;
  };

  const getTierColor = (tier) => {
    const colors = {
      trial: { bg: '#fef3c7', color: '#92400e' },
      basic: { bg: '#dbeafe', color: '#1e40af' },
      professional: { bg: '#e0e7ff', color: '#4338ca' },
      enterprise: { bg: '#fae8ff', color: '#86198f' }
    };
    return colors[tier] || colors.trial;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUpgradeSubscription = async (orgId, newTier, newFee, billingCycle) => {
    try {
      const expiryDate = new Date();
      if (billingCycle === 'annual') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          subscription_tier: newTier,
          subscription_status: 'active',
          subscription_expiry_date: expiryDate.toISOString(),
          monthly_fee: newFee,
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
          next_billing_date: expiryDate.toISOString()
        })
        .eq('id', orgId);

      if (orgError) throw orgError;

      const { error: subError } = await supabase
        .from('organization_subscriptions')
        .insert({
          organization_id: orgId,
          tier: newTier,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: expiryDate.toISOString(),
          monthly_fee: newFee,
          billing_cycle: billingCycle
        });

      if (subError) throw subError;

      alert('Subscription upgraded successfully!');
      setShowUpgradeModal(false);
      setSelectedOrg(null);
      loadData();
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Error upgrading subscription: ' + error.message);
    }
  };

  const handleRecordPayment = async (orgId, amount, paymentMethod, reference) => {
    try {
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .insert({
          organization_id: orgId,
          transaction_type: 'subscription',
          amount: amount,
          payment_method: paymentMethod,
          payment_reference: reference,
          payment_status: 'completed',
          payment_date: new Date().toISOString(),
          receipt_number: `RCP-${Date.now()}`
        });

      if (paymentError) throw paymentError;

      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
          next_billing_date: nextBilling.toISOString(),
          subscription_expiry_date: nextBilling.toISOString(),
          subscription_status: 'active'
        })
        .eq('id', orgId);

      if (orgError) throw orgError;

      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedOrg(null);
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment: ' + error.message);
    }
  };

  const handleSuspendOrganization = async (orgId, reason) => {
    if (!confirm('Are you sure you want to suspend this organization?')) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'suspended',
          is_active: false,
          suspended_at: new Date().toISOString(),
          suspension_reason: reason || 'Administrative action'
        })
        .eq('id', orgId);

      if (error) throw error;

      alert('Organization suspended successfully');
      loadData();
    } catch (error) {
      console.error('Error suspending organization:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleReactivateOrganization = async (orgId) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          is_active: true,
          suspended_at: null,
          suspension_reason: null
        })
        .eq('id', orgId);

      if (error) throw error;

      alert('Organization reactivated successfully');
      loadData();
    } catch (error) {
      console.error('Error reactivating organization:', error);
      alert('Error: ' + error.message);
    }
  };

  const styles = {
    container: {
      padding: '0'
    },
    header: {
      marginBottom: '32px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#0a1929',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      margin: 0
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    },
    statCard: {
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '13px',
      color: '#64748b',
      fontWeight: '600'
    },
    orgCard: {
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '16px'
    },
    orgHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px'
    },
    orgName: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '8px'
    },
    orgInfo: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '4px'
    },
    badgeRow: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    badge: {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '20px',
      padding: '20px',
      background: '#f8fafc',
      borderRadius: '8px'
    },
    detailItem: {
      fontSize: '13px'
    },
    detailLabel: {
      color: '#64748b',
      fontWeight: '600',
      marginBottom: '4px'
    },
    detailValue: {
      color: '#0a1929',
      fontWeight: '700'
    },
    buttonRow: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '700',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    primaryButton: {
      background: '#2563eb',
      color: 'white'
    },
    successButton: {
      background: '#10b981',
      color: 'white'
    },
    warningButton: {
      background: '#f59e0b',
      color: 'white'
    },
    dangerButton: {
      background: '#dc2626',
      color: 'white'
    },
    modal: {
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
      padding: '32px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#475569',
      marginBottom: '8px'
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px'
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ fontSize: '16px', color: '#64748b' }}>Loading subscriptions...</div>
      </div>
    );
  }

  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.subscription_status === 'active').length,
    trial: organizations.filter(o => o.subscription_tier === 'trial').length,
    expired: organizations.filter(o => o.subscription_status === 'expired').length,
    totalRevenue: organizations.reduce((sum, o) => sum + (parseFloat(o.monthly_fee) || 0), 0)
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Subscription Management</h2>
        <p style={styles.subtitle}>
          Manage organization subscriptions, payments, and billing
        </p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Organizations</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.active}</div>
          <div style={styles.statLabel}>Active Subscriptions</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.trial}</div>
          <div style={styles.statLabel}>Trial Accounts</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>TZS {stats.totalRevenue.toLocaleString()}</div>
          <div style={styles.statLabel}>Monthly Revenue</div>
        </div>
      </div>

      {organizations.map(org => {
        const daysRemaining = getDaysRemaining(org.subscription_expiry_date);
        const statusColor = getStatusColor(org.subscription_status);
        const tierColor = getTierColor(org.subscription_tier);

        return (
          <div key={org.id} style={styles.orgCard}>
            <div style={styles.orgHeader}>
              <div style={{ flex: 1 }}>
                <div style={styles.orgName}>{org.name}</div>
                <div style={styles.orgInfo}>{org.contact_email}</div>
                <div style={styles.orgInfo}>BRELA: {org.brela_registration || 'N/A'}</div>
              </div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...tierColor }}>
                  {org.subscription_tier?.toUpperCase()}
                </span>
                <span style={{ ...styles.badge, ...statusColor }}>
                  {org.subscription_status?.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Monthly Fee</div>
                <div style={styles.detailValue}>
                  TZS {parseFloat(org.monthly_fee || 0).toLocaleString()}
                </div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Payment Status</div>
                <div style={styles.detailValue}>
                  {org.payment_status?.toUpperCase() || 'PENDING'}
                </div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Days Remaining</div>
                <div style={styles.detailValue}>
                  {daysRemaining !== null ? `${daysRemaining} days` : 'N/A'}
                </div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Expiry Date</div>
                <div style={styles.detailValue}>
                  {org.subscription_expiry_date
                    ? new Date(org.subscription_expiry_date).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                onClick={() => {
                  setSelectedOrg(org);
                  setShowUpgradeModal(true);
                }}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Upgrade Subscription
              </button>
              <button
                onClick={() => {
                  setSelectedOrg(org);
                  setShowPaymentModal(true);
                }}
                style={{ ...styles.button, ...styles.successButton }}
              >
                Record Payment
              </button>
              {org.subscription_status === 'active' ? (
                <button
                  onClick={() => {
                    const reason = prompt('Enter suspension reason:');
                    if (reason) handleSuspendOrganization(org.id, reason);
                  }}
                  style={{ ...styles.button, ...styles.dangerButton }}
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleReactivateOrganization(org.id)}
                  style={{ ...styles.button, ...styles.warningButton }}
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        );
      })}

      {showUpgradeModal && selectedOrg && (
        <div style={styles.modal} onClick={() => setShowUpgradeModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Upgrade Subscription - {selectedOrg.name}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleUpgradeSubscription(
                selectedOrg.id,
                formData.get('tier'),
                parseFloat(formData.get('fee')),
                formData.get('billing_cycle')
              );
            }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Subscription Tier</label>
                <select name="tier" style={styles.select} required>
                  <option value="">Select tier...</option>
                  {subscriptionPlans.map(plan => (
                    <option key={plan.tier} value={plan.tier}>
                      {plan.name} - TZS {plan.monthly_price.toLocaleString()}/month
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Cycle</label>
                <select name="billing_cycle" style={styles.select} required>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual (Save 10%)</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Monthly Fee (TZS)</label>
                <input
                  type="number"
                  name="fee"
                  style={styles.input}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={styles.buttonRow}>
                <button type="submit" style={{ ...styles.button, ...styles.successButton }}>
                  Upgrade Now
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  style={{ ...styles.button, background: '#94a3b8', color: 'white' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedOrg && (
        <div style={styles.modal} onClick={() => setShowPaymentModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Record Payment - {selectedOrg.name}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleRecordPayment(
                selectedOrg.id,
                parseFloat(formData.get('amount')),
                formData.get('payment_method'),
                formData.get('reference')
              );
            }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (TZS)</label>
                <input
                  type="number"
                  name="amount"
                  style={styles.input}
                  defaultValue={selectedOrg.monthly_fee}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Method</label>
                <select name="payment_method" style={styles.select} required>
                  <option value="">Select method...</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Reference</label>
                <input
                  type="text"
                  name="reference"
                  style={styles.input}
                  placeholder="Transaction ID or reference number"
                />
              </div>
              <div style={styles.buttonRow}>
                <button type="submit" style={{ ...styles.button, ...styles.successButton }}>
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{ ...styles.button, background: '#94a3b8', color: 'white' }}
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
}
