import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#fff',
  borderRadius: '10px',
  padding: '12px 14px',
  fontFamily: 'Inter',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  fontFamily: 'Inter',
};

const friendlyError = (code: string): string => {
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/invalid-email') return 'That email address is not valid.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a moment.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection.';
  return 'Could not sign in. Please try again.';
};

export const Login: React.FC = () => {
  const { signIn, enterGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(friendlyError(err?.code ?? ''));
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-dark)',
    }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
          borderRadius: '20px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            fontFamily: 'Outfit',
            fontSize: '24px',
            letterSpacing: '2px',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
          }}>
            THE DATA APP
          </div>
          <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'Inter' }}>
            Sign in to continue
          </p>
        </div>

        <div>
          <label htmlFor="login-email" style={labelStyle}>Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="login-password" style={labelStyle}>Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !email || !password}
          style={{
            width: '100%',
            padding: '14px',
            background: busy || !email || !password ? 'rgba(255,255,255,0.05)' : 'var(--accent-gradient)',
            border: 'none',
            borderRadius: '14px',
            color: busy || !email || !password ? 'var(--text-muted)' : '#fff',
            fontFamily: 'Outfit',
            fontSize: '16px',
            fontWeight: 600,
            cursor: busy || !email || !password ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: '0.02em',
          }}
        >
          {busy ? 'Signing in...' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={enterGuestMode}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px',
            color: 'var(--text-secondary)',
            fontFamily: 'Outfit',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            letterSpacing: '0.02em',
          }}
        >
          Continue as guest
        </button>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'Inter', margin: 0 }}>
          Guests can view data but not make changes.
        </p>
      </form>
    </div>
  );
};
