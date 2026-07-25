import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './i18n';
import './styles/global.css';

const baseUrl = import.meta.env.PROD ? '/kov-cs-poetry' : '/';

// Browsers restore the previous scroll offset on reload, so a refresh resumed part-way
// down the page instead of at the top. Opt out and land at the top every time.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <BrowserRouter basename={baseUrl}>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
