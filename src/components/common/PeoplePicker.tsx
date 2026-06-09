import React, { useMemo } from 'react';
import { X, UserPlus } from 'lucide-react';

interface Props {
  /** All selectable names (from the People manager). */
  options: string[];
  /** Currently selected names. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Shown when no people exist yet / nothing to add. */
  emptyHint?: string;
}

/**
 * Multi-select for tagging one or more training partners on an activity.
 * Selected people show as removable chips; a dropdown adds the rest.
 */
export const PeoplePicker: React.FC<Props> = ({ options, value, onChange, emptyHint }) => {
  const available = useMemo(
    () => options.filter(o => !value.includes(o)).sort((a, b) => a.localeCompare(b)),
    [options, value],
  );

  const add = (name: string) => {
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
  };
  const remove = (name: string) => onChange(value.filter(n => n !== name));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {value.map(name => (
            <span
              key={name}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(96,165,250,0.14)', color: '#93C5FD',
                border: '1px solid rgba(96,165,250,0.35)', borderRadius: '999px',
                padding: '4px 6px 4px 12px', fontFamily: 'Inter', fontSize: '13px', fontWeight: 600,
              }}
            >
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: 'none',
                  color: '#93C5FD', cursor: 'pointer', padding: 0,
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {available.length > 0 ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <UserPlus size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            value=""
            onChange={e => { add(e.target.value); e.currentTarget.value = ''; }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '8px 10px 8px 32px',
              fontFamily: 'Inter', fontSize: '13px',
              outline: 'none', appearance: 'auto', cursor: 'pointer',
              width: '100%', boxSizing: 'border-box',
            }}
          >
            <option value="" style={{ background: 'var(--bg-dark)' }}>Add a person…</option>
            {available.map(name => (
              <option key={name} value={name} style={{ background: 'var(--bg-dark)' }}>{name}</option>
            ))}
          </select>
        </div>
      ) : value.length === 0 ? (
        <span style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--text-muted)' }}>
          {emptyHint ?? 'Add people in Settings → Training Partners first.'}
        </span>
      ) : null}
    </div>
  );
};
