import { dashboardStyles } from '../utils/dashboardStyles';

export default function PageHeader({ eyebrow, title, subtitle, onBack, actions }) {
  return (
    <div style={dashboardStyles.headerCard}>
      <div style={{
        ...dashboardStyles.headerContent,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {eyebrow && <div style={dashboardStyles.headerTitle}>{eyebrow}</div>}
          <h1 style={dashboardStyles.headerSubtitle}>{title}</h1>
          {subtitle && (
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px', maxWidth: '600px' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {actions}
          {onBack && (
            <button
              onClick={onBack}
              style={{ ...dashboardStyles.buttonSecondary, color: '#ffffff' }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
