import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function maskPhone(phone) {
  if (!phone) return '—';
  if (phone.length <= 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function ClickPesaPaymentDetail({ orgId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('payments');
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [expandedWebhook, setExpandedWebhook] = useState(null);
  const [activating, setActivating] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      const [paymentsRes, logsRes] = await Promise.all([
        supabase.from('subscription_payments').select('*').eq('organization_id', orgId)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('clickpesa_webhook_log').select('*')
          .order('created_at', { ascending: false }).limit(30),
      ]);
      setPayments(paymentsRes.data || []);
      setWebhookLogs(logsRes.data || []);
      setLoading(false);
    };
    load();
  }, [orgId]);

  const handleManualActivate = async (paymentId) => {
    if (!confirm('Manually activate this subscription? Only do this if payment was confirmed by other means.')) return;
    setActivating(paymentId);
    const { error } = await supabase.rpc('activate_subscription_after_payment', { p_payment_id: paymentId });
    setActivating(null);
    if (error) { alert('Activation failed: ' + error.message); return; }
    alert('Subscription activated.');
    const { data } = await supabase.from('subscription_payments').select('*').eq('organization_id', orgId)
      .order('created_at', { ascending: false }).limit(20);
    setPayments(data || []);
  };

  const sc = {
    tab: (active) => ({
      padding: '6px 14px', fontSize: '13px', fontWeight: active ? '700' : '600',
      color: active ? '#2563eb' : '#64748b', background: 'none', border: 'none',
      borderBottom: `2px solid ${active ? '#2563eb' : 'transparent'}`,
      cursor: 'pointer',
    }),
    statusBadge: (status) => {
      const map = { completed: ['#d1fae5','#065f46'], failed: ['#fee2e2','#991b1b'], processing: ['#eff6ff','#1d4ed8'] };
      const [bg, color] = map[status] || ['#f1f5f9','#475569'];
      return { background: bg, color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' };
    },
    cpStatus: (s) => {
      const map = { SUCCESS: ['#d1fae5','#065f46'], FAILED: ['#fee2e2','#991b1b'], PROCESSING: ['#eff6ff','#1d4ed8'], PENDING: ['#fef3c7','#92400e'] };
      const [bg, color] = map[s] || ['#f1f5f9','#475569'];
      return { background: bg, color, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' };
    },
  };

  if (loading) return <div style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>Loading payment details...</div>;

  const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div style={{ marginTop: '20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1.5px solid #e2e8f0', padding: '0 16px', background: '#f8fafc' }}>
        <button style={sc.tab(activeTab === 'payments')} onClick={() => setActiveTab('payments')}>
          ClickPesa Payments ({payments.length})
        </button>
        <button style={sc.tab(activeTab === 'webhooks')} onClick={() => setActiveTab('webhooks')}>
          Webhook Log ({webhookLogs.length})
        </button>
      </div>

      {activeTab === 'payments' && (
        payments.length === 0 ? (
          <div style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>No ClickPesa payments found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Amount', 'Method', 'Status', 'ClickPesa', 'Phone', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', borderBottom: '1.5px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const stuck = ['PROCESSING','PENDING'].includes(p.clickpesa_status) && new Date(p.initiated_at || p.created_at).getTime() < staleThreshold;
                return (
                  <>
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>TZS {Number(p.amount_gross_tzs ?? p.amount_tzs || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.payment_method || '—'}</td>
                      <td style={{ padding: '10px 12px' }}><span style={sc.statusBadge(p.status)}>{p.status}</span></td>
                      <td style={{ padding: '10px 12px' }}>{p.clickpesa_status ? <span style={sc.cpStatus(p.clickpesa_status)}>{p.clickpesa_status}</span> : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{maskPhone(p.payer_phone_number)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setExpandedPayment(expandedPayment === p.id ? null : p.id)}
                            style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {expandedPayment === p.id ? 'Hide' : 'Details'}
                          </button>
                          {stuck && (
                            <button
                              onClick={() => handleManualActivate(p.id)}
                              disabled={activating === p.id}
                              style={{ fontSize: '12px', padding: '3px 8px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', opacity: activating === p.id ? 0.6 : 1 }}>
                              {activating === p.id ? '...' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedPayment === p.id && (
                      <tr key={`${p.id}-detail`} style={{ background: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '12px', fontSize: '12px' }}>
                            {[
                              ['Transaction ID', p.clickpesa_transaction_id],
                              ['Order Reference', p.clickpesa_order_reference || p.payment_reference],
                              ['Channel', p.clickpesa_channel],
                              ['Webhook Received', p.webhook_received_at ? new Date(p.webhook_received_at).toLocaleString() : null],
                              ['Failure Reason', p.failure_reason],
                              ['Payer Name', p.payer_name],
                            ].filter(([, v]) => v).map(([label, val]) => (
                              <div key={label}>
                                <div style={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
                                <div style={{ fontFamily: 'monospace', color: '#0a1929' }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          {p.webhook_raw_payload && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ color: '#64748b', fontWeight: '600', fontSize: '12px', marginBottom: '4px' }}>Raw Webhook Payload</div>
                              <pre style={{ padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px' }}>
                                {JSON.stringify(p.webhook_raw_payload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )
      )}

      {activeTab === 'webhooks' && (
        webhookLogs.length === 0 ? (
          <div style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>No webhook events recorded.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Transaction ID', 'Status', 'Signature', 'Received', 'Payload'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', borderBottom: '1.5px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {webhookLogs.map(entry => (
                <>
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{entry.transaction_id?.slice(0, 20)}...</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', background: entry.status === 'SUCCESS' ? '#d1fae5' : entry.status === 'FAILED' ? '#fee2e2' : '#fef3c7', color: entry.status === 'SUCCESS' ? '#065f46' : entry.status === 'FAILED' ? '#991b1b' : '#92400e' }}>
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: entry.signature_valid ? '#065f46' : '#991b1b', fontWeight: '600', fontSize: '12px' }}>
                      {entry.signature_valid ? 'Valid' : 'Invalid'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => setExpandedWebhook(expandedWebhook === entry.id ? null : entry.id)}
                        style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {expandedWebhook === entry.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedWebhook === entry.id && (
                    <tr key={`${entry.id}-wh`} style={{ background: '#f8fafc' }}>
                      <td colSpan={5} style={{ padding: '12px 16px' }}>
                        <pre style={{ padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '200px' }}>
                          {JSON.stringify(entry.raw_payload, null, 2)}
                        </pre>
                        {entry.processing_error && (
                          <div style={{ marginTop: '8px', color: '#dc2626', fontSize: '12px' }}>Error: {entry.processing_error}</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

const TIER_META = {
  small_firm:  { label: 'Small Firm',   bg: '#d1fae5', color: '#065f46' },
  medium_firm: { label: 'Medium Firm',  bg: '#e0f2fe', color: '#0c4a6e' },
  large_firm:  { label: 'Large Firm',   bg: '#fce7f3', color: '#9d174d' },
};

const PAYMENT_METHODS = [
  { value: 'mpesa',               label: 'M-Pesa' },
  { value: 'mixx_by_yas',         label: 'Mixx by Yas' },
  { value: 'airtel_money',        label: 'Airtel Money' },
  { value: 'halopesa',            label: 'HaloPesa' },
  { value: 'bank_transfer_crdb',  label: 'CRDB Bank Transfer' },
  { value: 'manual_admin',        label: 'Manual (admin)' },
];

export default function SubscriptionManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingUpgrade, setSavingUpgrade] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsResult, plansResult] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('display_order')
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

  const getTierMeta = (tier) => TIER_META[tier] || { label: tier, bg: '#f1f5f9', color: '#475569' };

  const getStatusColor = (status) => {
    const map = {
      active:    { bg: '#d1fae5', color: '#065f46' },
      expired:   { bg: '#fee2e2', color: '#991b1b' },
      suspended: { bg: '#fef3c7', color: '#92400e' },
    };
    return map[status] || { bg: '#f1f5f9', color: '#475569' };
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  };

  const formatTZS = (val) => val != null ? `TZS ${Number(val).toLocaleString()}` : 'Contact Sales';

  const handleUpgradeSubscription = async (orgId, newTier, billingCycle) => {
    setSavingUpgrade(true);
    try {
      const plan = subscriptionPlans.find(p => p.tier === newTier);
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
          max_users: plan?.max_users ?? null,
        })
        .eq('id', orgId);

      if (orgError) throw orgError;

      alert('Subscription updated successfully!');
      setShowUpgradeModal(false);
      setSelectedOrg(null);
      loadData();
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Error upgrading subscription: ' + error.message);
    } finally {
      setSavingUpgrade(false);
    }
  };

  const handleRecordPayment = async (orgId, grossAmount, paymentMethod, reference, billingCycle, tier) => {
    setSavingPayment(true);
    try {
      const VAT_RATE = 18;
      const netAmount = Math.round(grossAmount / (1 + VAT_RATE / 100));
      const vatAmount = grossAmount - netAmount;

      const expiryDate = new Date();
      if (billingCycle === 'annual') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      }

      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          organization_id: orgId,
          payment_reference: reference || `REF-${Date.now()}`,
          payment_type: 'subscription_renewal',
          payment_method: paymentMethod,
          amount_gross_tzs: grossAmount,
          amount_net_tzs: netAmount,
          vat_amount_tzs: vatAmount,
          vat_rate: VAT_RATE,
          subscription_tier: tier,
          billing_period: billingCycle,
          period_start: new Date().toISOString().split('T')[0],
          period_end: expiryDate.toISOString().split('T')[0],
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

      if (paymentError) throw paymentError;

      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          subscription_expiry_date: expiryDate.toISOString(),
          is_active: true,
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
    } finally {
      setSavingPayment(false);
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
      alert('Error: ' + error.message);
    }
  };

  const styles = {
    container: { padding: '0' },
    header: { marginBottom: '32px' },
    title: { fontSize: '24px', fontWeight: '700', color: '#0a1929', margin: '0 0 8px 0' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px', marginBottom: '32px'
    },
    statCard: { background: 'white', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px' },
    statValue: { fontSize: '32px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' },
    statLabel: { fontSize: '13px', color: '#64748b', fontWeight: '600' },
    orgCard: { background: 'white', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '16px' },
    orgHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
    orgName: { fontSize: '18px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' },
    orgInfo: { fontSize: '13px', color: '#64748b', marginBottom: '4px' },
    badgeRow: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
    badge: { padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' },
    detailsGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px', marginBottom: '20px', padding: '20px',
      background: '#f8fafc', borderRadius: '8px'
    },
    detailItem: { fontSize: '13px' },
    detailLabel: { color: '#64748b', fontWeight: '600', marginBottom: '4px' },
    detailValue: { color: '#0a1929', fontWeight: '700' },
    buttonRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    button: {
      padding: '10px 20px', borderRadius: '8px', fontSize: '13px',
      fontWeight: '700', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s'
    },
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modalContent: {
      background: 'white', borderRadius: '16px', padding: '32px',
      maxWidth: '560px', width: '90%', maxHeight: '90vh', overflow: 'auto'
    },
    modalTitle: { fontSize: '20px', fontWeight: '700', color: '#0a1929', marginBottom: '24px' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' },
    select: { width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
    planCard: {
      border: '2px solid #e2e8f0', borderRadius: '10px', padding: '14px',
      marginBottom: '10px', cursor: 'pointer', transition: 'border-color 0.2s'
    },
    planName: { fontWeight: '700', fontSize: '15px', color: '#0a1929', marginBottom: '4px' },
    planPrice: { fontSize: '13px', color: '#2563eb', fontWeight: '600' },
    planDesc: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#64748b' }}>Loading subscriptions...</div>
      </div>
    );
  }

  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.subscription_status === 'active' && !o.is_trialing).length,
    trialing: organizations.filter(o => o.is_trialing === true).length,
    expired: organizations.filter(o => o.subscription_status === 'expired').length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Subscription Management</h2>
        <p style={styles.subtitle}>Manage organization subscriptions, payments, and billing</p>
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
          <div style={styles.statValue}>{stats.trialing}</div>
          <div style={styles.statLabel}>On Free Trial</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.expired}</div>
          <div style={styles.statLabel}>Expired</div>
        </div>
      </div>

      {organizations.map(org => {
        const daysRemaining = getDaysRemaining(org.subscription_expiry_date);
        const statusColor = getStatusColor(org.subscription_status);
        const tierMeta = getTierMeta(org.subscription_tier);
        const plan = subscriptionPlans.find(p => p.tier === org.subscription_tier);

        return (
          <div key={org.id} style={styles.orgCard}>
            <div style={styles.orgHeader}>
              <div style={{ flex: 1 }}>
                <div style={styles.orgName}>{org.name}</div>
                <div style={styles.orgInfo}>{org.contact_email}</div>
                {org.brela_registration && (
                  <div style={styles.orgInfo}>BRELA: {org.brela_registration}</div>
                )}
              </div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, background: tierMeta.bg, color: tierMeta.color }}>
                  {tierMeta.label.toUpperCase()}
                </span>
                {org.is_trialing && (
                  <span style={{ ...styles.badge, background: '#fef3c7', color: '#92400e' }}>
                    FREE TRIAL
                  </span>
                )}
                <span style={{ ...styles.badge, background: statusColor.bg, color: statusColor.color }}>
                  {(org.subscription_status || 'unknown').toUpperCase()}
                </span>
              </div>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Plan</div>
                <div style={styles.detailValue}>{plan?.name || tierMeta.label}</div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Monthly Price</div>
                <div style={styles.detailValue}>{formatTZS(plan?.price_monthly_tzs)}</div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Max Users</div>
                <div style={styles.detailValue}>{plan?.max_users ?? 'Unlimited'}</div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Max Clients</div>
                <div style={styles.detailValue}>{plan?.max_clients ?? 'Unlimited'}</div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>IRAs / Year</div>
                <div style={styles.detailValue}>
                  {plan?.max_iras_per_year != null ? plan.max_iras_per_year : 'Unlimited'}
                </div>
              </div>
              <div style={styles.detailItem}>
                <div style={styles.detailLabel}>Days Remaining</div>
                <div style={{
                  ...styles.detailValue,
                  color: daysRemaining !== null && daysRemaining < 14 ? '#dc2626' : '#0a1929'
                }}>
                  {daysRemaining !== null ? `${daysRemaining} days` : 'No expiry set'}
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
                onClick={() => { setSelectedOrg(org); setShowUpgradeModal(true); }}
                style={{ ...styles.button, background: '#2563eb', color: 'white' }}
              >
                Change Plan
              </button>
              <button
                onClick={() => { setSelectedOrg(org); setShowPaymentModal(true); }}
                style={{ ...styles.button, background: '#10b981', color: 'white' }}
              >
                Record Payment
              </button>
              {org.subscription_status === 'active' ? (
                <button
                  onClick={() => {
                    const reason = prompt('Enter suspension reason:');
                    if (reason) handleSuspendOrganization(org.id, reason);
                  }}
                  style={{ ...styles.button, background: '#dc2626', color: 'white' }}
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleReactivateOrganization(org.id)}
                  style={{ ...styles.button, background: '#f59e0b', color: 'white' }}
                >
                  Reactivate
                </button>
              )}
            </div>

            <ClickPesaPaymentDetail orgId={org.id} />
          </div>
        );
      })}

      {/* Upgrade / Change Plan Modal */}
      {showUpgradeModal && selectedOrg && (
        <div style={styles.modal} onClick={() => setShowUpgradeModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Change Plan — {selectedOrg.name}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              handleUpgradeSubscription(selectedOrg.id, fd.get('tier'), fd.get('billing_cycle'));
            }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Plan</label>
                {subscriptionPlans.map(plan => (
                  <label
                    key={plan.tier}
                    style={{
                      ...styles.planCard,
                      display: 'block',
                      borderColor: plan.tier === selectedOrg.subscription_tier ? '#2563eb' : '#e2e8f0',
                    }}
                  >
                    <input type="radio" name="tier" value={plan.tier}
                      defaultChecked={plan.tier === selectedOrg.subscription_tier}
                      style={{ marginRight: '10px' }}
                      required
                    />
                    <span style={styles.planName}>{plan.name}</span>
                    {plan.contact_sales ? (
                      <span style={{ ...styles.planPrice, color: '#64748b' }}> — Contact Sales</span>
                    ) : (
                      <span style={styles.planPrice}>
                        {' '}— {formatTZS(plan.price_monthly_tzs)}/mo · {formatTZS(plan.price_annual_tzs)}/yr
                      </span>
                    )}
                    <div style={styles.planDesc}>
                      {plan.max_users ?? '∞'} users · {plan.max_clients ?? '∞'} clients ·{' '}
                      {plan.max_iras_per_year ?? '∞'} IRAs/yr
                    </div>
                  </label>
                ))}
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Cycle</label>
                <select name="billing_cycle" style={styles.select} required>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual (~17% discount)</option>
                </select>
              </div>
              <div style={styles.buttonRow}>
                <button
                  type="submit"
                  disabled={savingUpgrade}
                  style={{ ...styles.button, background: '#10b981', color: 'white', opacity: savingUpgrade ? 0.6 : 1 }}
                >
                  {savingUpgrade ? 'Saving...' : 'Apply Change'}
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

      {/* Record Payment Modal */}
      {showPaymentModal && selectedOrg && (
        <div style={styles.modal} onClick={() => setShowPaymentModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Record Payment — {selectedOrg.name}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              handleRecordPayment(
                selectedOrg.id,
                parseInt(fd.get('amount'), 10),
                fd.get('payment_method'),
                fd.get('reference'),
                fd.get('billing_cycle'),
                selectedOrg.subscription_tier
              );
            }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Gross Amount Paid (TZS, VAT-inclusive)</label>
                <input
                  type="number" name="amount" style={styles.input}
                  defaultValue={
                    subscriptionPlans.find(p => p.tier === selectedOrg.subscription_tier)?.price_monthly_tzs || ''
                  }
                  required min="0" step="1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Billing Cycle</label>
                <select name="billing_cycle" style={styles.select} required>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Method</label>
                <select name="payment_method" style={styles.select} required>
                  <option value="">Select method...</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Reference / Transaction ID</label>
                <input
                  type="text" name="reference" style={styles.input}
                  placeholder="e.g. MPESA transaction ID"
                />
              </div>
              <div style={{
                padding: '12px', background: '#f0f9ff', borderRadius: '8px',
                fontSize: '12px', color: '#0c4a6e', marginBottom: '20px'
              }}>
                VAT (18%) will be calculated automatically from the gross amount entered.
              </div>
              <div style={styles.buttonRow}>
                <button
                  type="submit"
                  disabled={savingPayment}
                  style={{ ...styles.button, background: '#10b981', color: 'white', opacity: savingPayment ? 0.6 : 1 }}
                >
                  {savingPayment ? 'Saving...' : 'Record Payment'}
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
