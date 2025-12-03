import { Calendar1Icon, CalendarDaysIcon, ZapIcon } from 'lucide-react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { APP_PAGES } from './config/pages';
import { Agenda, Energy, Week } from './pages';

// Map icon names to actual icon components
const iconMap = {
  Calendar1Icon,
  CalendarDaysIcon,
  ZapIcon
};

// Map component names to actual components
const componentMap = {
  Agenda,
  Week,
  Energy
};

// Combine config with React components
const pages = APP_PAGES.map(page => ({
  ...page,
  icon: iconMap[page.icon as keyof typeof iconMap],
  component: componentMap[page.component as keyof typeof componentMap],
}));

function Tabs() {
  const location = useLocation();

  return (
    <div className="h-full relative gap-1 flex flex-col pt-2">
      {pages.map((page, index) => (
        <Link
          key={index}
          to={page.path}
          className={twMerge(
            "h-14 w-14 flex items-center justify-center bg-gray-200 rounded-l-xl text-gray-700",
            location.pathname === page.path && "bg-black text-white"
          )}
        >
          <page.icon className="w-8 h-8" />
        </Link>
      ))}
    </div>
  );
}

function AppContent() {
  return (
    <div className="w-[800px] h-[600px] bg-white text-black flex flex-col">
      <main className="flex-1 flex flex-row gap-4 pl-12">
        <div className="grow">
          <Routes>
            {pages.map((page) => (
              <Route
                key={page.path}
                path={page.path}
                element={<page.component />}
              />
            ))}
          </Routes>
        </div>

        <div className="flex-0">
          <Tabs />
        </div>
      </main>

      <footer className="mt-auto text-right p-2 text-sm text-gray-600">
        Last updated: {new Date().toLocaleString('de-DE')}
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App
