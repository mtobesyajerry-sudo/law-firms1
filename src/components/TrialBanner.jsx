import React from 'react';
import { Link } from 'react-router-dom';
import { fmtDate } from '../utils/dateFormat';

export default function TrialBanner({ daysUntilTrialEnds, trialEndsAt }) {
  const days = daysUntilTrialEnds ?? 0;

  let bg, border, textColor, label;
  if (days <= 1) {
    bg = '#fef2f2';
    border = '#fca5a5';
    textColor = '#b91c1c';
    label = days === 0 ? 'Your trial ends today.' : 'Your trial ends tomorrow.';
  } else if (days <= 3) {
    bg = '#fff7ed';
    border = '#fdba74';
    textColor = '#c2410c';
    label = `Your free trial ends in ${days} days.`;
  } else {
    bg = '#fffbeb';
    border = '#fcd34d';
    textColor = '#92400e';
    const endDate = trialEndsAt ? fmtDate(trialEndsAt) : '';
    label = `You are on a free trial${endDate ? ` ending ${endDate}` : ''}.`;
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: bg,
      borderBottom: `2px solid ${border}`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '14px', color: textColor, fontWeight: '600' }}>
        {label}
        {days > 0 && days <= 7 && ` Subscribe now to keep access.`}
      </span>
      <Link
        to="/pricing"
        style={{
          padding: '6px 18px', fontSize: '13px', fontWeight: '700',
          color: '#0a1929',
          background: 'linear-gradient(135deg,#d4af37,#f4d03f)',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
        }}
      >
        See plans
      </Link>
    </div>
  );
}
