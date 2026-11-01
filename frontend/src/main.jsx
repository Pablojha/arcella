import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { BadgeProvider } from './context/BadgeContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BadgeProvider>
              <App />
            </BadgeProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator && !window.Capacitor) navigator.serviceWorker.register('/sw.js');
