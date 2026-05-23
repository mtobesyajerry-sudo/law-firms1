import { useState } from 'react';
import { supabase } from '../supabaseClient';

const BACKUP_CODE_PATTERN = /^[A-Z0-9]{8}$/;

export default function MfaChallenge({ onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError('');
    setLoading(true);

    const trimmed = code.trim().toUpperCase();
    const isBackup = BACKUP_CODE_PATTERN.test(trimmed);

    try {
      if (isBackup) {
        await verifyBackupCode(trimmed);
      } else {
        await verifyTotp(trimmed);
      }
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      setError(err.message || 'Verification failed. Please try again.');
      if (next >= 5) {
        setError('Too many failed attempts. Please sign in again.');
        setTimeout(() => onCancel?.(), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async (totpCode) => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (!totp) throw new Error('No authenticator app enrolled.');

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (challengeError) throw challengeError;

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challengeData.id,
      code: totpCode,
    });
    if (verifyError) throw verifyError;

    onSuccess?.('totp');
  };

  const verifyBackupCode = async (backupCode) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('No active session.');

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-mfa-backup-code`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ code: backupCode }),
    });

    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || 'Backup code verification failed.');

    onSuccess?.('backup');
  };

  const s = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(10,25,41,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    },
    card: {
      background: '#fff', borderRadius: '16px',
      border: '2px solid #d4af37',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      maxWidth: '420px', width: '100%',
      padding: '36px',
    },
    header: {
      textAlign: 'center',
      borderBottom: '2px solid #d4af37',
      paddingBottom: '16px', marginBottom: '24px',
    },
    icon: { fontSize: '36px', marginBottom: '8px' },
    title: { fontSize: '22px', fontWeight: '700', color: '#0a1929', margin: '0 0 6px' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 },
    input: {
      width: '100%', padding: '14px 16px',
      fontSize: '22px', fontWeight: '700',
      letterSpacing: '6px', textAlign: 'center',
      border: '2px solid #cbd5e0', borderRadius: '8px',
      background: '#f8fafc', outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '12px',
    },
    btn: {
      width: '100%', padding: '14px',
      fontSize: '16px', fontWeight: '700',
      color: '#0a1929',
      background: 'linear-gradient(135deg,#d4af37 0%,#f4d03f 100%)',
      border: 'none', borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    },
    btnSecondary: {
      width: '100%', padding: '10px',
      fontSize: '14px', fontWeight: '600',
      color: '#64748b', background: 'transparent',
      border: '1px solid #cbd5e0', borderRadius: '8px',
      cursor: 'pointer', marginTop: '8px',
    },
    error: {
      padding: '10px 14px', background: '#fef2f2',
      border: '1px solid #fca5a5', borderRadius: '8px',
      fontSize: '13px', color: '#b91c1c', marginBottom: '12px',
    },
    hint: {
      fontSize: '12px', color: '#94a3b8',
      textAlign: 'center', marginTop: '12px', lineHeight: 1.5,
    },
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.icon}>🔑</div>
          <h2 style={s.title}>Two-Factor Authentication</h2>
          <p style={s.subtitle}>
            Enter the 6-digit code from your authenticator app, or an 8-character backup code.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\s/g, '').slice(0, 8))}
            style={s.input}
            placeholder="000000"
            autoFocus
            autoComplete="one-time-code"
          />

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" style={s.btn} disabled={loading || !code.trim()}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          {onCancel && (
            <button type="button" style={s.btnSecondary} onClick={onCancel}>
              Cancel and sign out
            </button>
          )}
        </form>

        <p style={s.hint}>
          Lost your authenticator? Enter one of your 8-character backup codes instead.
        </p>
      </div>
    </div>
  );
}
