import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Trophy, CalendarDays, Settings, Footprints } from 'lucide-react';
import './BottomNav.css';

const items = [
  { to: '/',          icon: LayoutDashboard, label: 'Home',     end: true  },
  { to: '/workouts',  icon: Activity,        label: 'Workouts', end: false },
  { to: '/running',   icon: Footprints,      label: 'Running',  end: false },
  { to: '/records',   icon: Trophy,          label: 'Records',  end: false },
  { to: '/monthly',   icon: CalendarDays,    label: 'Reports',  end: false },
  { to: '/settings',  icon: Settings,        label: 'Settings', end: false },
];

export const BottomNav: React.FC = () => (
  <nav className="bottom-nav">
    {items.map(({ to, icon: Icon, label, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Icon size={22} />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);
