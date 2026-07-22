import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Header({ onLogout }: { onLogout?: () => void } = {}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${el.getBoundingClientRect().height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [mobileOpen]);

  return (
    <header ref={headerRef} className="site-header">
      <div className="header-inner">
        <Link to="/" className="logo" onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          Kovács
        </Link>
        <p className="subtitle">KÖLTÉSZET</p>

        <nav className={`main-nav ${mobileOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <NavLink to="/" end onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Főoldal
              </NavLink>
            </li>
            <li>
              <NavLink to="/poems" onClick={() => setMobileOpen(false)}>
                Versek
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" onClick={() => setMobileOpen(false)}>
                Kapcsolat
              </NavLink>
            </li>
            <li className="nav-login-mobile">
              {onLogout
                ? <button type="button" className="nav-logout-btn" onClick={() => { setMobileOpen(false); onLogout(); }}>Kijelentkezés</button>
                : <NavLink to="/admin" onClick={() => setMobileOpen(false)}>Admin</NavLink>
              }
            </li>
          </ul>
        </nav>

        {onLogout
          ? <button type="button" className="header-login-btn" onClick={onLogout}>Kijelentkezés</button>
          : <Link to="/admin" className="header-login-btn">Admin</Link>
        }
        <ThemeToggle />

        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menü"
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}