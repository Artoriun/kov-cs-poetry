import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Váltás ${theme === 'light' ? 'sötét' : 'világos'} módra`}
      title={`Váltás ${theme === 'light' ? 'sötét' : 'világos'} módra`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
