import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, BarChart3, CalendarDays, Settings as SettingsIcon, Trophy, ChevronsLeft, ChevronsRight, Dumbbell, Footprints } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, isOpen = false, onClose }) => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/workouts', icon: Activity, label: 'Workouts' },
    { to: '/running', icon: Footprints, label: 'Running' },
    { to: '/records', icon: Trophy, label: 'Trophy Room' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/monthly', icon: CalendarDays, label: 'Monthly Reports' },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          {isCollapsed
            ? <span className="sidebar-logo-icon"><Dumbbell size={22} /></span>
            : <h2>Workouts Data</h2>
          }
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? label : undefined}
              onClick={onClose}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'Settings' : undefined}
            onClick={onClose}
          >
            <SettingsIcon size={20} />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>

          <button className="collapse-toggle" onClick={onToggle} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
