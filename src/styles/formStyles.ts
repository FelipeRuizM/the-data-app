import type { CSSProperties } from 'react';

// Shared form-control styles matching the app's glassmorphism theme.
export const inputStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#fff',
  borderRadius: '10px',
  padding: '10px 14px',
  fontFamily: 'Inter',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'auto',
  cursor: 'pointer',
};

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  fontFamily: 'Inter',
};
