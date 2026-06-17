import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="logo" onClick={() => setMobileOpen(false)}>
          Kovács
        </Link>
        <p className="subtitle">POETRY</p>

        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>

        <nav className={`main-nav ${mobileOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <NavLink to="/" end onClick={() => setMobileOpen(false)}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/projects" onClick={() => setMobileOpen(false)}>
                Poems
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" onClick={() => setMobileOpen(false)}>
                Contact
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}