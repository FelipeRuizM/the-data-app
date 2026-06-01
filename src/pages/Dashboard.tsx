import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Footprints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TaggedWorkout } from '../hooks/useWorkouts';

const BigButton: React.FC<{
  icon: LucideIcon;
  label: string;
  subtitle: string;
  gradient: string;
  glow: string;
  onClick: () => void;
}> = ({ icon: Icon, label, subtitle, gradient, glow, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '14px', minHeight: '190px', padding: '28px', cursor: 'pointer',
      border: 'none', borderRadius: '24px', background: gradient, color: '#fff',
      boxShadow: `0 10px 30px ${glow}`, transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${glow}`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 10px 30px ${glow}`; }}
  >
    <div style={{
      width: '68px', height: '68px', borderRadius: '20px', flexShrink: 0,
      background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={36} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Outfit', fontSize: '24px', fontWeight: 700, letterSpacing: '0.01em' }}>{label}</div>
      <div style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>{subtitle}</div>
    </div>
  </button>
);

export const Dashboard: React.FC<{ workouts: TaggedWorkout[] }> = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: '0 32px',
        animation: 'fadeIn 0.5s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 220px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '28px', fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>
          What are you logging today?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <BigButton
            icon={Dumbbell}
            label="Workout"
            subtitle="Log a lifting session"
            gradient="var(--accent-gradient)"
            glow="rgba(255,46,147,0.30)"
            onClick={() => navigate('/add/workout')}
          />
          <BigButton
            icon={Footprints}
            label="Run"
            subtitle="Log a run"
            gradient="linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)"
            glow="rgba(59,130,246,0.30)"
            onClick={() => navigate('/add/run')}
          />
        </div>
      </div>
    </div>
  );
};
