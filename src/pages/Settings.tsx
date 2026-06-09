import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { ExerciseManager } from '../components/settings/ExerciseManager';
import { GymManager } from '../components/settings/GymManager';
import { PeopleManager } from '../components/settings/PeopleManager';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { unit, toggleUnit } = useSettings();
  const { user, isGuest, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
      setSigningOut(false);
    }
  };

  return (
    <div style={{ padding: '0 32px', animation: 'fadeIn 0.5s ease-out' }}>
      <h2 style={{ marginBottom: '24px', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>Settings</h2>

      <Card style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Weight Unit</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Choose your preferred unit for globally tracking volume metrics and lifts.
            </p>
          </div>

          <div
            onClick={toggleUnit}
            style={{
              width: '64px',
              height: '32px',
              background: unit === 'lbs' ? 'var(--accent-pink-main)' : 'rgba(255,255,255,0.1)',
              borderRadius: '32px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s ease',
              boxShadow: unit === 'lbs' ? '0 0 15px rgba(255,46,147,0.4)' : 'none'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              background: '#fff',
              borderRadius: '50%',
              position: 'absolute',
              top: '4px',
              left: unit === 'lbs' ? '36px' : '4px',
              transition: 'left 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontWeight: '600', fontSize: '14px', fontFamily: 'Outfit' }}>
          <span style={{ color: unit === 'kg' ? 'var(--accent-pink-main)' : 'var(--text-secondary)', transition: 'color 0.3s ease' }}>Metric (KG)</span>
          <span style={{ color: unit === 'lbs' ? 'var(--accent-pink-main)' : 'var(--text-secondary)', transition: 'color 0.3s ease' }}>Imperial (LBS)</span>
        </div>
      </Card>

      <Card style={{ maxWidth: '600px', marginTop: '24px' }}>
        <ExerciseManager />
      </Card>

      <Card style={{ maxWidth: '600px', marginTop: '24px' }}>
        <GymManager />
      </Card>

      <Card style={{ maxWidth: '600px', marginTop: '24px' }}>
        <PeopleManager />
      </Card>

      <Card style={{ maxWidth: '600px', marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Account</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          {isGuest
            ? 'You are viewing as a guest (read-only).'
            : <>Signed in as <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.email ?? 'unknown'}</span></>}
        </p>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            padding: '10px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            borderRadius: '10px',
            fontFamily: 'Outfit',
            fontSize: '14px',
            fontWeight: 600,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {signingOut ? (isGuest ? 'Exiting...' : 'Signing out...') : (isGuest ? 'Exit Guest' : 'Sign Out')}
        </button>
      </Card>
    </div>
  );
};
