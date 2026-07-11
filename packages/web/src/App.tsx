import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Poems from './pages/Poems';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import { PoemsProvider } from './context/PoemsContext';

export default function App() {
  useEffect(() => {
    const handler = () => window.location.reload();
    screen.orientation
      ? screen.orientation.addEventListener('change', handler)
      : window.addEventListener('orientationchange', handler);
    return () => {
      screen.orientation
        ? screen.orientation.removeEventListener('change', handler)
        : window.removeEventListener('orientationchange', handler);
    };
  }, []);

  return (
    <PoemsProvider>
      <div className="page-load-scrim" aria-hidden="true" />
      <Routes>
        <Route path="/admin" element={<Admin />} />
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
