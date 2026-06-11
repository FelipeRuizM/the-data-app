import React from 'react';
import type { CSSProperties, ComponentType } from 'react';
import { pageTitleStyle } from '../../styles/typography';

// Icon + title header that every page opens with (except the Dashboard) —
// see CLAUDE.md → "UI patterns". Accepts a Lucide icon or any component
// taking size/color props.
interface PageHeaderProps {
  icon: ComponentType<{ size?: number | string; color?: string }>;
  title: string;
  /** Override e.g. marginBottom when the header sits inside a flex row. */
  style?: CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, title, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', ...style }}>
    <Icon size={28} color="var(--accent-pink-main)" />
    <h2 style={pageTitleStyle}>{title}</h2>
  </div>
);
