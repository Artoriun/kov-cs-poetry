import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { PoemsProvider } from './context/PoemsContext';
import Admin from './pages/Admin';
import Contact from './pages/Contact';
import Home from './pages/Home';
import Poems from './pages/Poems';

export default function App() {
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
