export const dashboardStyles = {
  pageContainer: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
    padding: '24px'
  },

  headerCard: {
    background: 'linear-gradient(135deg, #0a1929, #1a2f45)',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    border: '2px solid #d4af37',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
  },

  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },

  headerTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#d4af37',
    letterSpacing: '1px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    marginBottom: '8px'
  },

  headerSubtitle: {
    margin: '0',
    fontSize: '36px',
    fontWeight: '800',
    color: 'white'
  },

  backButton: {
    padding: '12px 24px',
    background: 'transparent',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    marginBottom: '16px'
  },

  contentCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px 32px',
    border: '1px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    marginBottom: '24px'
  },

  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 20px 0'
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
    marginBottom: '24px'
  },

  statCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid #e8eaed',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },

  statCardHover: {
    borderColor: '#d4af37',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
  },

  statLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px'
  },

  statValue: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0a1929',
    marginBottom: '2px',
    lineHeight: '1.1'
  },

  statSubtext: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: '500'
  },

  tabContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e8eaed',
    marginBottom: '24px',
    overflowX: 'auto'
  },

  tab: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },

  tabActive: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid #d4af37',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },

  tableHeader: {
    padding: '12px',
    textAlign: 'left',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '13px',
    borderBottom: '2px solid #d4af37',
    letterSpacing: '0.5px'
  },

  tableCell: {
    padding: '12px',
    borderBottom: '1px solid #e8eaed',
    color: '#2d3748',
    fontSize: '14px'
  },

  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },

  badgeSuccess: {
    background: '#d1fae5',
    color: '#065f46'
  },

  badgeWarning: {
    background: '#fef3c7',
    color: '#92400e'
  },

  badgeError: {
    background: '#fee2e2',
    color: '#991b1b'
  },

  badgeInfo: {
    background: '#dbeafe',
    color: '#1e40af'
  },

  badgeNeutral: {
    background: '#f1f5f9',
    color: '#475569'
  },

  button: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #0a1929, #1a2f45)',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },

  buttonSecondary: {
    padding: '10px 20px',
    background: 'transparent',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    color: '#0a1929',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },

  buttonDanger: {
    padding: '8px 16px',
    background: '#dc2626',
    border: '2px solid #991b1b',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },

  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#94a3b8'
  },

  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },

  emptyStateText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b',
    marginBottom: '8px'
  },

  emptyStateSubtext: {
    fontSize: '14px',
    color: '#94a3b8'
  },

  quickActionCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #e8eaed',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center'
  },

  quickActionIcon: {
    fontSize: '48px',
    marginBottom: '12px'
  },

  quickActionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '8px'
  },

  quickActionDescription: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5'
  }
};

export const getBadgeStyle = (type) => {
  const styles = {
    success: dashboardStyles.badgeSuccess,
    warning: dashboardStyles.badgeWarning,
    error: dashboardStyles.badgeError,
    info: dashboardStyles.badgeInfo,
    neutral: dashboardStyles.badgeNeutral
  };
  return { ...dashboardStyles.badge, ...(styles[type] || styles.neutral) };
};

export const getRiskBadgeStyle = (riskLevel) => {
  const colors = {
    Low: { bg: '#d1fae5', color: '#065f46' },
    Medium: { bg: '#fef3c7', color: '#92400e' },
    High: { bg: '#fed7aa', color: '#c2410c' },
    'Very High': { bg: '#fee2e2', color: '#991b1b' }
  };
  const style = colors[riskLevel] || colors.Low;
  return {
    ...dashboardStyles.badge,
    background: style.bg,
    color: style.color
  };
};

export const getStatusBadgeStyle = (status) => {
  const statusMap = {
    active: 'success',
    open: 'info',
    pending: 'warning',
    completed: 'success',
    closed: 'neutral',
    rejected: 'error',
    suspended: 'error',
    approved: 'success'
  };
  return getBadgeStyle(statusMap[status?.toLowerCase()] || 'neutral');
};
