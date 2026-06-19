import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './styles/global.css';

const baseUrl = import.meta.env.PROD ? "/kov-cs-poetry" : "/";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={baseUrl}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);