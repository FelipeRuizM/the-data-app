import React from 'react';
import './SectionHeader.css';

/**
 * Labeled section divider used to group a page into Activities / Workouts /
 * Runs. The `color` tints the icon chip — pass a hex value (it's concatenated
 * with alpha suffixes, so CSS variables won't work here).
 */
export const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  /** Reduce the top margin when this is the first section on the page. */
  compact?: boolean;
}> = ({ icon: Icon, title, subtitle, color, compact }) => (
  <div className={`section-head${compact ? ' section-head--tight' : ''}`}>
    <div
      className="section-head-icon"
      style={{ background: `${color}1F`, border: `1px solid ${color}59`, color }}
    >
      <Icon size={20} />
    </div>
    <div>
      <h3 className="section-head-title">{title}</h3>
      <span className="section-head-subtitle">{subtitle}</span>
    </div>
  </div>
);
