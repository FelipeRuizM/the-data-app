import React, { useMemo } from 'react';
import { Trophy, Flame, LineChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculatePRs, REP_BASED_EXERCISES, type PRData } from '../utils/prEngine';
import { useSettings } from '../context/SettingsContext';
import { format } from 'date-fns';
import './PersonalRecords.css';

export const PersonalRecords: React.FC<any> = ({ workouts }) => {
  const { unit } = useSettings();
  const navigate = useNavigate();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const prs = useMemo(() => calculatePRs(workouts), [workouts]);

  const championsList = ['Bench Press', 'Squat', 'Pull Up'];

  const champions = championsList.map(title =>
    prs.find(pr => pr.exerciseTitle.toLowerCase().includes(title.toLowerCase())) ||
    { exerciseTitle: title, maxWeight: 0, maxReps: 0, maxVolume: 0, maxWeightDate: new Date(), maxRepsDate: new Date(), maxVolumeDate: new Date(), daysSinceLastPR: 0 } as PRData
  );

  const hof = prs.filter(pr => !championsList.some(title => pr.exerciseTitle.toLowerCase().includes(title.toLowerCase())));

  const tierClass = ['gold', 'silver', 'bronze'];

  const isRepBased = (exerciseTitle: string) =>
    REP_BASED_EXERCISES.some(name => exerciseTitle.toLowerCase().includes(name.toLowerCase()));

  const renderCard = (pr: PRData, isChampion: boolean, championIndex?: number) => {
    const displayWeight = Math.round(pr.maxWeight * multiplier);
    const displayVol = Math.round(pr.maxVolume * multiplier);
    const repBased = isRepBased(pr.exerciseTitle);

    // Pull Up Breakdown Logic (only relevant for non-rep-based display path)
    let bodyweightAnnotation = null;
    if (!repBased && pr.exerciseTitle.toLowerCase().includes('pull up') && pr.bodyweightAtPR) {
      const bwDis = Math.round(pr.bodyweightAtPR * multiplier);
      const addedDis = displayWeight - bwDis;
      bodyweightAnnotation = (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
          {displayWeight} {unit} ({bwDis}{unit} + {addedDis > 0 ? `${addedDis}${unit}` : `0${unit}`})
        </div>
      );
    }

    const cardClass = isChampion
      ? `champion-card ${tierClass[championIndex ?? 0]}`
      : 'hof-card';

    const hasRecord = repBased ? pr.maxReps > 0 : displayWeight > 0;

    const handleClick = () => {
      const params = new URLSearchParams({
        exercise: pr.exerciseTitle,
        timeframe: 'all',
      });
      navigate(`/analytics?${params.toString()}`);
    };

    return (
      <div
        key={pr.exerciseTitle}
        className={`${cardClass} pr-card-clickable`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {isChampion && <div className="champion-glow" />}
        <LineChart size={isChampion ? 18 : 14} className="pr-card-link-icon" />
        <h3 style={{ fontSize: isChampion ? '24px' : '18px', margin: '0 0 16px 0', fontFamily: 'Outfit' }}>
          {pr.exerciseTitle}
        </h3>

        <div className="pr-stat">
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {repBased ? 'Max Reps PR' : 'Max Weight'}
            </div>
            <div className="pr-value">
              {repBased
                ? (pr.maxReps > 0 ? `${pr.maxReps} Reps` : '-')
                : (displayWeight > 0 ? `${displayWeight} ${unit}` : '-')
              }
            </div>
            {bodyweightAnnotation}
          </div>
          <div className="pr-date">
            {repBased
              ? (pr.maxReps > 0 ? format(pr.maxRepsDate, 'MMM d, yyyy') : '')
              : (displayWeight > 0 ? format(pr.maxWeightDate, 'MMM d, yyyy') : '')
            }
          </div>
        </div>

        <div className="pr-stat" style={{ marginTop: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Set Volume</div>
            <div className="pr-vol-value">{displayVol > 0 ? `${displayVol.toLocaleString()} ${unit}` : '-'}</div>
          </div>
          <div className="pr-date">{displayVol > 0 ? format(pr.maxVolumeDate, 'MMM d, yyyy') : ''}</div>
        </div>

        <div className="days-counter">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={16} color={pr.daysSinceLastPR < 7 ? 'var(--accent-pink-main)' : 'var(--text-muted)'} />
            Days since PR
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{hasRecord ? pr.daysSinceLastPR : '-'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pr-container">
      <div className="pr-header">
        <Trophy size={32} color="var(--accent-pink-main)" />
        <h2>Trophy Room</h2>
      </div>

      <div className="champions-grid">
        {champions.map((pr, i) => renderCard(pr, true, i))}
      </div>

      <h3 className="hall-of-fame-title">Hall of Fame</h3>
      <div className="hof-grid">
        {hof.map(pr => renderCard(pr, false))}
        {hof.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No other records found.</div>}
      </div>
    </div>
  );
};
