import React from 'react';
import './TopNavigation.css';

export const TopNavigation: React.FC = () => {
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <header className="top-nav glass-panel">
      <div className="top-nav-left">
        <h1 className="page-title">Overview</h1>
        <span className="current-date">{currentDate}</span>
      </div>
    </header>
  );
};
