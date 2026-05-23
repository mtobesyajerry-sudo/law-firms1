import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Generates 10 random 8-character alphanumeric backup codes
function generateBackupCodes() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
}

// SHA-256 hash for backup code storage (consistent with password_history approach)
async function hashCode(code) {
  const encoded = new TextEncoder().encode(code.toUpperCase());
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function MfaEnrollment({ onComplete, onSkip, gracePeriodEnds, forced = false }) {
  const [step, setStep] = useState('loading'); // loading | qr | verify | backup | done
  const [factorId, setFactorId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const graceDate = gracePeriodEnds ? new Date(gracePeriodEnds) : null;
  const daysLeft = graceDate
    ? Math.max(0, Math.ceil((graceDate - Date.now()) / 86400000))
    : 0;

  const startEnrollment = useCallback(async () => {
    setError('');
    setStep('loading');
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });
      if (enrollError) throw enrollError;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep('qr');
    } catch (err) {
      setError(err.message || 'Failed to start MFA enrollment. Please try again.');
      setStep('qr');
    }
  }, []);

  useEffect(() => {
    startEnrollment();
  }, [startEnrollment]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!factorId || totpCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      // Create challenge then verify
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      setChallengeId(challengeData.id);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: totpCode,
      });
      if (verifyError) throw verifyError;

      // Enrollment verified — generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);

      // Store hashes in DB
      const { data: { user } } = await supabase.auth.getUser();
      const hashes = await Promise.all(codes.map(hashCode));
      const rows = hashes.map(code_hash => ({ user_id: user.id, code_hash }));

      // Delete any previously generated (unused) backup codes before inserting new set
      await supabase
        .from('mfa_backup_codes')
        .delete()
        .eq('user_id', user.id)
        .is('used_at', null);

      const { error: insertError } = await supabase.from('mfa_backup_codes').insert(rows);
      if (insertError) throw insertError;

      // Clear grace period — MFA enrolled
      await supabase
        .from('user_profiles')
        .update({ mfa_grace_period_ends: null })
        .eq('id', user.id);

      setStep('backup');
    } catch (err) {
      setError(err.message || 'Verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    setStep('done');
    onComplete?.();
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

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
      maxWidth: '500px', width: '100%',
      padding: '36px',
      maxHeight: '90vh', overflowY: 'auto',
    },
    header: {
      borderBottom: '2px solid #d4af37',
      paddingBottom: '16px', marginBottom: '24px',
      textAlign: 'center',
    },
    icon: { fontSize: '40px', marginBottom: '8px' },
    title: { fontSize: '22px', fontWeight: '700', color: '#0a1929', margin: '0 0 6px' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 },
    nudge: {
      background: daysLeft <= 3 ? '#fef2f2' : '#fffbeb',
      border: `1px solid ${daysLeft <= 3 ? '#fca5a5' : '#fcd34d'}`,
      borderRadius: '8px', padding: '12px 16px',
      fontSize: '13px', color: daysLeft <= 3 ? '#b91c1c' : '#92400e',
      marginBottom: '20px', lineHeight: 1.5,
    },
    section: { marginBottom: '20px' },
    label: { fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', display: 'block' },
    qrWrap: {
      display: 'flex', justifyContent: 'center',
      padding: '16px', background: '#f8fafc',
      borderRadius: '12px', border: '1px solid #e2e8f0',
      marginBottom: '12px',
    },
    secretBox: {
      fontFamily: 'monospace', fontSize: '13px',
      background: '#f1f5f9', border: '1px solid #cbd5e0',
      borderRadius: '8px', padding: '10px 14px',
      letterSpacing: '2px', wordBreak: 'break-all',
      color: '#1e293b',
    },
    input: {
      width: '100%', padding: '12px 16px',
      fontSize: '22px', fontWeight: '700',
      letterSpacing: '8px', textAlign: 'center',
      border: '2px solid #cbd5e0', borderRadius: '8px',
      background: '#f8fafc', outline: 'none',
      boxSizing: 'border-box',
    },
    btn: {
      width: '100%', padding: '14px',
      fontSize: '16px', fontWeight: '700',
      color: '#0a1929',
      background: 'linear-gradient(135deg,#d4af37 0%,#f4d03f 100%)',
      border: 'none', borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
      marginTop: '8px',
    },
    btnSecondary: {
      width: '100%', padding: '12px',
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
    backupGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: '8px', margin: '12px 0',
    },
    backupCode: {
      fontFamily: 'monospace', fontSize: '15px', fontWeight: '700',
      background: '#f1f5f9', border: '1px solid #cbd5e0',
      borderRadius: '8px', padding: '10px',
      textAlign: 'center', letterSpacing: '3px', color: '#1e293b',
    },
    checkLabel: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px', background: '#f0fdf4',
      border: '1px solid #86efac', borderRadius: '8px',
      cursor: 'pointer', fontSize: '14px', color: '#166534',
      fontWeight: '600', marginBottom: '12px',
    },
    stepper: {
      display: 'flex', justifyContent: 'center',
      gap: '8px', marginBottom: '24px',
    },
    stepDot: (active, done) => ({
      width: '10px', height: '10px', borderRadius: '50%',
      background: done ? '#d4af37' : active ? '#0a1929' : '#e2e8f0',
      transition: 'background 0.3s',
    }),
  };

  const stepNum = { loading: 0, qr: 1, verify: 2, backup: 3, done: 4 }[step] ?? 0;

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.icon}>🔐</div>
          <h2 style={s.title}>Set Up Two-Factor Authentication</h2>
          <p style={s.subtitle}>
            Protect your account with a time-based one-time password (TOTP) from your authenticator app.
          </p>
        </div>

        {/* Progress dots */}
        <div style={s.stepper}>
          {[1, 2, 3].map(n => (
            <div key={n} style={s.stepDot(stepNum === n, stepNum > n)} />
          ))}
        </div>

        {/* Grace period nudge (non-forced only) */}
        {!forced && graceDate && step !== 'backup' && step !== 'done' && (
          <div style={s.nudge}>
            {daysLeft > 0
              ? `Two-factor authentication is required. You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining before access is restricted.`
              : 'Your grace period has expired. Please complete MFA enrollment to continue.'}
          </div>
        )}

        {/* ── Step 1: QR Code ── */}
        {step === 'qr' && (
          <>
            <div style={s.section}>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, marginTop: 0 }}>
                Open Google Authenticator, Authy, or 1Password and scan the QR code below.
              </p>
              {qrCode ? (
                <div style={s.qrWrap}>
                  {/* QR code is an SVG data URI from Supabase — safe to render as img src */}
                  <img src={qrCode} alt="TOTP QR code" width={200} height={200} />
                </div>
              ) : (
                <div style={{ ...s.qrWrap, height: '200px', alignItems: 'center', color: '#94a3b8' }}>
                  {error ? 'Failed to load QR code' : 'Loading...'}
                </div>
              )}
            </div>

            {secret && (
              <div style={s.section}>
                <span style={s.label}>Manual entry key (if you can't scan the QR code):</span>
                <div style={s.secretBox}>{secret}</div>
              </div>
            )}

            {error && <div style={s.error}>{error}</div>}

            <button style={s.btn} onClick={() => setStep('verify')} disabled={!qrCode}>
              I've scanned the code — Next
            </button>
            {!forced && onSkip && (
              <button style={s.btnSecondary} onClick={onSkip}>
                Remind me later {graceDate && daysLeft > 0 ? `(${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)` : ''}
              </button>
            )}
          </>
        )}

        {/* ── Step 2: Verify 6-digit code ── */}
        {step === 'verify' && (
          <form onSubmit={handleVerify}>
            <div style={s.section}>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, marginTop: 0 }}>
                Enter the 6-digit code shown in your authenticator app to confirm setup.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={s.input}
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" style={s.btn} disabled={loading || totpCode.length !== 6}>
              {loading ? 'Verifying...' : 'Verify and Activate'}
            </button>
            <button type="button" style={s.btnSecondary} onClick={() => setStep('qr')}>
              Back to QR code
            </button>
          </form>
        )}

        {/* ── Step 3: Backup codes ── */}
        {step === 'backup' && (
          <>
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
            }}>
              <strong style={{ color: '#166534', fontSize: '14px' }}>
                Two-factor authentication is now active.
              </strong>
              <p style={{ fontSize: '13px', color: '#166534', margin: '4px 0 0', lineHeight: 1.5 }}>
                Save these 10 backup codes somewhere safe. Each code can be used once if you lose access to your authenticator app.
              </p>
            </div>

            <div style={s.backupGrid}>
              {backupCodes.map((code, i) => (
                <div key={i} style={s.backupCode}>{code}</div>
              ))}
            </div>

            <button style={{ ...s.btnSecondary, marginBottom: '12px' }} onClick={handleCopyCodes}>
              {copied ? 'Copied!' : 'Copy all codes to clipboard'}
            </button>

            <label style={s.checkLabel}>
              <input
                type="checkbox"
                checked={savedConfirmed}
                onChange={e => setSavedConfirmed(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              I have saved my backup codes in a secure location
            </label>

            {error && <div style={s.error}>{error}</div>}

            <button style={s.btn} onClick={handleDone} disabled={!savedConfirmed}>
              Complete Setup
            </button>
          </>
        )}

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            Loading enrollment...
          </div>
        )}
      </div>
    </div>
  );
}
