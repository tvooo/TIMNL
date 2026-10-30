import { Calendar1Icon, CalendarDaysIcon, CloudSunIcon, ImageIcon, ZapIcon } from 'lucide-react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { APP_PAGES } from './config/pages';
import { Agenda, Energy, Photo, Weather, Week } from './pages';
import { useDisplay } from './useDisplay';

// Map icon names to actual icon components
const iconMap = {
  Calendar1Icon,
  CalendarDaysIcon,
  CloudSunIcon,
  ImageIcon,
  ZapIcon,
};

// Map component names to actual components
const componentMap = {
  Agenda,
  Week,
  Energy,
  Weather,
  Photo,
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
          to={{ pathname: page.path, search: location.search }}
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
  const location = useLocation();
  const display = useDisplay();
  // Full-bleed pages (the photo) fill the whole frame: no tab rail, no
  // footer, no padding.
  const fullBleed = pages.some(
    (page) => page.path === location.pathname && page.fullBleed
  );

  return (
    <div
      className="bg-white text-black flex flex-col overflow-hidden"
      style={{ width: display.width, height: display.height }}
    >
      <main className={twMerge("flex-1 flex flex-row gap-4 pl-12", fullBleed && "gap-0 pl-0")}>
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

        {!fullBleed && (
          <div className="flex-0">
            <Tabs />
          </div>
        )}
      </main>

      {!fullBleed && (
        <footer className="mt-auto text-right p-2 text-sm text-gray-600">
          Last updated: {new Date().toLocaleString('de-DE')}
        </footer>
      )}
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
