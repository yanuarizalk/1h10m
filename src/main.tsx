import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerServiceWorker } from './serviceWorkerRegistration';

// Register Service Worker with interactive update lifecycle hooks
registerServiceWorker({
  onUpdateAvailable: (reloadFn) => {
    console.log('[SIA-Orbit] New SW update waiting. Dispatching update event.');
    window.dispatchEvent(new CustomEvent('sia-orbit-sw-update', { detail: { reloadFn } }));
  },
  onUpdateDownloading: () => {
    console.log('[SIA-Orbit] Downloading new SW cache...');
    window.dispatchEvent(new CustomEvent('sia-orbit-sw-downloading'));
  },
  onOfflineReady: () => {
    console.log('[SIA-Orbit] App is ready for offline usage.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
