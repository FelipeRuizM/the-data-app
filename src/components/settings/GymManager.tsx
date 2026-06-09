import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { useGyms, type Gym } from '../../context/GymsContext';
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
  width: '34px',
  height: '34px',
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

// ── A single gym row — view mode with inline edit ────────────────────────────
const GymRow: React.FC<{ gym: Gym }> = ({ gym }) => {
  const { updateGym, deleteGym } = useGyms();
  const { canWrite } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(gym.name);
  const [busy, setBusy]   = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await updateGym(gym.id, { name: trimmed });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update gym:', err);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setName(gym.name);
    setEditing(false);
  };

  const del = async () => {
    if (!window.confirm(`Delete "${gym.name}"? This won't change activities already logged with it.`)) return;
    setBusy(true);
    try {
      await deleteGym(gym.id);
    } catch (err) {
      console.error('Failed to delete gym:', err);
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          style={{ ...inputStyle, flex: '2 1 150px' }}
          autoFocus
        />
        <button onClick={save} disabled={busy} title="Save" style={{ ...iconBtnStyle, color: '#2ecc71' }}>
          <Check size={15} />
        </button>
        <button onClick={cancel} disabled={busy} title="Cancel" style={iconBtnStyle}>
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0',
      borderBottom: '1px dashed rgba(255,255,255,0.05)',
    }}>
      <span style={{ flex: 1, fontFamily: 'Inter', fontSize: '14px', color: 'var(--text-primary)' }}>
        {gym.name}
      </span>
      {canWrite && (
        <>
          <button onClick={() => setEditing(true)} disabled={busy} title="Edit" style={iconBtnStyle}>
            <Pencil size={14} />
          </button>
          <button onClick={del} disabled={busy} title="Delete" style={{ ...iconBtnStyle, color: '#fca5a5' }}>
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
};

// ── Gym / location manager ───────────────────────────────────────────────────
export const GymManager: React.FC = () => {
  const { gyms, loading, createGym } = useGyms();
  const { canWrite } = useAuth();
  const [search, setSearch]   = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? gyms.filter(g => g.name.toLowerCase().includes(q)) : gyms;
  }, [gyms, search]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (gyms.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      setError('A place with that name already exists.');
      return;
    }
    setError('');
    setAdding(true);
    try {
      await createGym(name);
      setNewName('');
    } catch (err) {
      console.error('Failed to create gym:', err);
      setError('Could not save. Try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Gyms &amp; Locations</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Add the gyms and places you train or run at, then pick one when logging an activity.
      </p>

      {/* Add form (owner only) */}
      {canWrite && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              placeholder="New gym or location"
              style={{ ...inputStyle, flex: '2 1 150px' }}
            />
            <button
              onClick={add}
              disabled={adding || !newName.trim()}
              style={{
                padding: '10px 18px',
                background: newName.trim() ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '10px',
                color: newName.trim() ? '#fff' : 'var(--text-muted)',
                fontFamily: 'Outfit', fontWeight: 600, fontSize: '14px',
                cursor: adding || !newName.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              }}
            >
              <Plus size={15} /> {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {error && <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        </>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${gyms.length} place${gyms.length === 1 ? '' : 's'}…`}
        style={{ ...inputStyle, marginBottom: '4px' }}
      />

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>
          {gyms.length === 0
            ? 'No places yet. Add your first one above.'
            : 'No places match your search.'}
        </p>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {filtered.map(g => <GymRow key={g.id} gym={g} />)}
        </div>
      )}
    </div>
  );
};
