import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Poems from './pages/Poems';
import Contact from './pages/Contact';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Poems />} />
        <Route path="/projects/:id" element={<Poems />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}
