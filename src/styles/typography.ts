import type { CSSProperties } from 'react';

/**
 * Shared typography scale — every page follows the same hierarchy
 * (see CLAUDE.md → "UI patterns"):
 *
 *   pageTitle    → the single h2 at the top of a page
 *   sectionTitle → h3 separating sections within a page
 *   cardTitle    → title of a Card / history list item (pairs with a 16px icon)
 *   bodyText     → metric & info lines (Inter 14, secondary)
 *   metaText     → dates and fine print (Inter 13, muted)
 *   statValue    → the big number inside a stat card
 */
export const pageTitleStyle: CSSProperties = {
  fontFamily: 'Outfit',
  fontSize: '24px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
  margin: 0,
};

export const sectionTitleStyle: CSSProperties = {
  fontFamily: 'Outfit',
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
  margin: 0,
};

export const cardTitleStyle: CSSProperties = {
  fontFamily: 'Outfit',
  fontSize: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
};

export const bodyTextStyle: CSSProperties = {
  fontFamily: 'Inter',
  fontSize: '14px',
  color: 'var(--text-secondary)',
};

export const metaTextStyle: CSSProperties = {
  fontFamily: 'Inter',
  fontSize: '13px',
  color: 'var(--text-muted)',
};

export const statValueStyle: CSSProperties = {
  fontFamily: 'Inter',
  fontSize: '32px',
  fontWeight: 'bold',
  color: 'var(--text-primary)',
};
