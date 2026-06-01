import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Dumbbell, Footprints, X } from 'lucide-react';
import { OverviewMetrics } from '../components/dashboard/OverviewMetrics';
import { VolumeChart } from '../components/dashboard/VolumeChart';
import { MuscleChart } from '../components/dashboard/MuscleChart';
import { FilterBar, type TimeframeFilter } from '../components/dashboard/FilterBar';
import { useAuth } from '../context/AuthContext';
import { subWeeks, subMonths, subYears } from 'date-fns';

// ── "Add Workout or Run" launcher ─────────────────────────────
const AddLauncher: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const choiceBtn = (color: string): React.CSSProperties => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    padding: '16px', borderRadius: '14px', cursor: 'pointer',
    background: `${color}1A`, border: `1px solid ${color}55`, color,
    fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, transition: 'all 0.2s ease',
  });

  return (
    <div style={{ marginBottom: '28px' }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '18px', borderRadius: '16px', cursor: 'pointer', border: 'none',
            background: 'var(--accent-gradient)', color: '#fff',
            fontFamily: 'Outfit', fontSize: '17px', fontWeight: 600, letterSpacing: '0.01em',
            boxShadow: '0 8px 24px rgba(255,46,147,0.18)', transition: 'all 0.2s ease',
          }}
        >
          <Plus size={22} /> Add Workout or Run
        </button>
      ) : (
        <div style={{
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              What do you want to add?
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/add/workout')} style={choiceBtn('#FF2E93')}>
              <Dumbbell size={20} /> Workout
            </button>
            <button onClick={() => navigate('/add/run')} style={choiceBtn('#60A5FA')}>
              <Footprints size={20} /> Run
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<any> = ({ workouts }) => {
  const { canWrite } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('All Time');

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w: any) => {
      if (selectedCategories.length > 0) {
        const cat = w.category || w.splitType || 'Mixed';
        if (!selectedCategories.includes(cat)) return false;
      }
      
      if (timeframeFilter !== 'All Time') {
        const now = new Date();
        let cutoff = new Date();
        
        if (timeframeFilter === 'Last Week') cutoff = subWeeks(now, 1);
        else if (timeframeFilter === 'Last Month') cutoff = subMonths(now, 1);
        else if (timeframeFilter === 'Last 3 Months') cutoff = subMonths(now, 3);
        else if (timeframeFilter === 'Last Year') cutoff = subYears(now, 1);
        
        if (w.startTime < cutoff) return false;
      }
      
      return true;
    });
  }, [workouts, selectedCategories, timeframeFilter]);

  return (
    <div style={{ padding: '0 32px', animation: 'fadeIn 0.5s ease-out' }}>

      {canWrite && <AddLauncher />}

      <FilterBar
        selectedCategories={selectedCategories} 
        setSelectedCategories={setSelectedCategories}
        timeframeFilter={timeframeFilter}
        setTimeframeFilter={setTimeframeFilter}
      />
      
      <h2 style={{ marginBottom: '24px', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>Analytics Overview</h2>
      <OverviewMetrics workouts={filteredWorkouts} />
      
      <div className="dashboard-charts-grid">
        <VolumeChart workouts={filteredWorkouts} />
        <MuscleChart workouts={filteredWorkouts} />
      </div>
    </div>
  );
};
