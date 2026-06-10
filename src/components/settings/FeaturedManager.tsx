import React, { useMemo, useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { useFeatured } from '../../context/FeaturedContext';
import { useExercises } from '../../context/ExercisesContext';
import { useAuth } from '../../context/AuthContext';

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: '10px',
  padding: '10px 14px',
  fontFamily: 'Inter',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const iconBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  flexShrink: 0,
};

export const FeaturedManager: React.FC = () => {
  const { featured, addFeatured, removeFeatured, moveFeatured } = useFeatured();
  const { exercises } = useExercises();
  const { canWrite } = useAuth();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  // Exercise catalog names not already featured, filtered by the search box.
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return exercises
      .map(e => e.name)
      .filter(name => !featured.includes(name) && name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [exercises, featured, search]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      console.error('Failed to update featured exercises:', err);
    } finally {
      setBusy(false);
    }
  };

  const add = (name: string) => { setSearch(''); run(() => addFeatured(name)); };

  return (
    <div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Star size={18} color="var(--accent-pink-main)" /> Featured Records
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Pick the exercises that headline your Records page. Reorder them to control how they appear.
        {' '}If you don't pick any, your top lifts by weight are shown automatically.
      </p>

      {!canWrite && (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Sign in as the owner to customize featured records.
        </p>
      )}

      {/* Add via searchable catalog (owner only) */}
      {canWrite && (
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search an exercise to feature…"
            style={inputStyle}
          />
          {suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                background: 'rgba(10,13,20,0.97)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
              }}
            >
              {suggestions.map(name => (
                <button
                  key={name}
                  onClick={() => add(name)}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                    padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                    fontFamily: 'Inter', fontSize: '14px', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,46,147,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Plus size={14} /> {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current featured list, in display order */}
      {featured.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>
          No featured exercises yet — your top lifts are shown automatically.
        </p>
      ) : (
        <div>
          {featured.map((name, i) => (
            <div
              key={name}
              style={{
                display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 0',
                borderBottom: '1px dashed rgba(255,255,255,0.05)',
              }}
            >
              <span style={{
                width: '22px', height: '22px', flexShrink: 0, borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,46,147,0.12)', color: 'var(--accent-pink-main)',
                fontFamily: 'Outfit', fontSize: '12px', fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ flex: 1, fontFamily: 'Inter', fontSize: '14px', color: 'var(--text-primary)' }}>
                {name}
              </span>
              {canWrite && (
                <>
                  <button onClick={() => run(() => moveFeatured(name, 'up'))} disabled={busy || i === 0}
                    title="Move up" style={{ ...iconBtnStyle, opacity: i === 0 ? 0.35 : 1 }}>
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => run(() => moveFeatured(name, 'down'))} disabled={busy || i === featured.length - 1}
                    title="Move down" style={{ ...iconBtnStyle, opacity: i === featured.length - 1 ? 0.35 : 1 }}>
                    <ChevronDown size={15} />
                  </button>
                  <button onClick={() => run(() => removeFeatured(name))} disabled={busy}
                    title="Remove" style={{ ...iconBtnStyle, color: '#fca5a5' }}>
                    <X size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
