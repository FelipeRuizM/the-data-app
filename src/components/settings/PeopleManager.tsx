import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { usePeople, type Person } from '../../context/PeopleContext';
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

// ── A single person row — view mode with inline edit ─────────────────────────
const PersonRow: React.FC<{ person: Person }> = ({ person }) => {
  const { updatePerson, deletePerson } = usePeople();
  const { canWrite } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [busy, setBusy]   = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await updatePerson(person.id, { name: trimmed });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update person:', err);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setName(person.name);
    setEditing(false);
  };

  const del = async () => {
    if (!window.confirm(`Delete "${person.name}"? This won't change activities already logged with them.`)) return;
    setBusy(true);
    try {
      await deletePerson(person.id);
    } catch (err) {
      console.error('Failed to delete person:', err);
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
        {person.name}
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

// ── People manager ───────────────────────────────────────────────────────────
export const PeopleManager: React.FC = () => {
  const { people, loading, createPerson } = usePeople();
  const { canWrite } = useAuth();
  const [search, setSearch]   = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? people.filter(p => p.name.toLowerCase().includes(q)) : people;
  }, [people, search]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setError('Someone with that name already exists.');
      return;
    }
    setError('');
    setAdding(true);
    try {
      await createPerson(name);
      setNewName('');
    } catch (err) {
      console.error('Failed to create person:', err);
      setError('Could not save. Try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Training Partners</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Add the people you train or run with, then tag them on an activity.
      </p>

      {/* Add form (owner only) */}
      {canWrite && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              placeholder="New person's name"
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
        placeholder={`Search ${people.length} ${people.length === 1 ? 'person' : 'people'}…`}
        style={{ ...inputStyle, marginBottom: '4px' }}
      />

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>
          {people.length === 0
            ? 'No people yet. Add your first one above.'
            : 'No people match your search.'}
        </p>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {filtered.map(p => <PersonRow key={p.id} person={p} />)}
        </div>
      )}
    </div>
  );
};
