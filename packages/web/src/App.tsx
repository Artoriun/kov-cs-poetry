import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { PoemsProvider } from './context/PoemsContext';
import { LanguageProvider } from './i18n';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Poems from './pages/Poems';

export default function App() {
  return (
    <PoemsProvider>
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
              <Admin />
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
