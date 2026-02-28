import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let profile = null;
        let retries = 0;

        while (!profile && retries < 5) {
          const { data } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (data) {
            profile = data;
          } else {
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
          }
        }

        navigate('/admin/dashboard');
      }
    } catch (err) {
      if (err.message === 'Invalid login credentials') {
        const { data: pendingRequest } = await supabase
          .from('registration_requests')
          .select('status')
          .eq('email', email)
          .maybeSingle();

        if (pendingRequest) {
          if (pendingRequest.status === 'pending') {
            setError('Your registration is pending approval. Please wait for an administrator to approve your account.');
          } else if (pendingRequest.status === 'rejected') {
            setError('Your registration was rejected. Please contact support for more information.');
          } else {
            setError('Invalid email or password. Please try again.');
          }
        } else {
          setError('Invalid email or password. Please check your credentials and try again.');
        }
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Law Firm AML Compliance System</h1>
          <p style={styles.subtitle}>Comprehensive AML/CFT Compliance Management for Legal Professionals</p>
        </div>

        <form onSubmit={handleLoginSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Loading...' : 'Sign In'}
          </button>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#475569',
              textAlign: 'center',
              marginBottom: '12px'
            }}>
              Contact your administrator to request an account
            </div>
            <div style={{
              textAlign: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '12px'
            }}>
              <a
                href="/register/tanzania-law-firm"
                style={{
                  color: '#1e40af',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Tanzania Law Firm? Register Here
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 50%, #0d1f33 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    maxWidth: '450px',
    width: '100%',
    padding: '40px',
    border: '2px solid #d4af37',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5568',
    margin: 0,
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0a1929',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: '#f8f9fa',
  },
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
  },
  error: {
    padding: '12px',
    background: '#fed7d7',
    color: '#c53030',
    borderRadius: '8px',
    fontSize: '14px',
  },
};
