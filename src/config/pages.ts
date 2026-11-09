// Shared pages configuration
// This file is imported by both App.tsx (for routing) and capture.ts (for screenshots)

export interface PageConfig {
  path: string;
  name: string;
  component: string;
  icon: string;
  /** Render edge to edge, without the tab rail and the footer. */
  fullBleed?: boolean;
  /** Keep the route, but leave it out of the tabs and the rotation. */
  disabled?: boolean;
}

/** Show the tab rail on the right of each page. */
export const SHOW_TABS = false;

export const APP_PAGES: PageConfig[] = [
  {
    path: '/',
    name: 'agenda',
    component: 'Agenda',
    icon: 'Calendar1Icon',
  },
  {
    path: '/week',
    name: 'week',
    component: 'Week',
    icon: 'CalendarDaysIcon',
  },
  {
    path: '/energy',
    name: 'energy',
    component: 'Energy',
    icon: 'ZapIcon',
  },
  {
    path: '/photo',
    name: 'photo',
    component: 'Photo',
    icon: 'ImageIcon',
    fullBleed: true,
    disabled: true,
  },
];
