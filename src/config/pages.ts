// Shared pages configuration
// This file is imported by both App.tsx (for routing) and capture.ts (for screenshots)

export interface PageConfig {
  path: string;
  name: string;
  component: string;
  icon: string;
}

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
];
