import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { PoemsProvider } from './context/PoemsContext';
import { LanguageProvider } from './i18n';
import { useRouteMeta } from './lib/useRouteMeta';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Poems from './pages/Poems';

// Split out of the main bundle: the portal and its stylesheet are only ever used by the
// site owner, but were being downloaded by every visitor. admin.css is imported solely by
// this module, so it moves into the same chunk.
const Admin = lazy(() => import('./pages/Admin'));

/** Renders nothing; exists so the hook sits inside both the router and PoemsProvider. */
function RouteMeta() {
  useRouteMeta();
  return null;
}

export default function App() {
  return (
    <PoemsProvider>
      <RouteMeta />
      <div className="page-load-scrim" aria-hidden="true" />
      <Routes>
        {/* The admin portal runs in English by default, independently of the public site,
            which stays Hungarian. A nested provider keeps the two separate: switching
            language inside the portal cannot affect the rest of the site, and leaving it
            unmounts this provider entirely. */}
        <Route
          path="/admin"
          element={
            <LanguageProvider defaultLang="en" scoped>
              {/* Untranslated: the portal defaults to English and this shows only for the
                  moment the chunk is in flight, before the dictionary is even loaded. */}
              <Suspense fallback={<p className="loading-prompt">Loading…</p>}>
                <Admin />
              </Suspense>
            </LanguageProvider>
          }
        />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/poems" element={<Poems />} />
          <Route path="/poems/:id" element={<Poems />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
      </Routes>
    </PoemsProvider>
  );
}
