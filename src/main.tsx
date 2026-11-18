import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { I18nProvider } from './i18n/context';
import { canAttemptChunkReload, tryReloadOnChunkError } from './utils/chunkRecovery';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', event => {
    if (canAttemptChunkReload()) {
      event.preventDefault();
      void tryReloadOnChunkError();
    }
  });
}

if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  !('__TAURI_INTERNALS__' in window)
) {
  let lastSwCheckAt = Date.now();
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible') return;
        if (navigator.onLine === false) return;
        const now = Date.now();
        if (now - lastSwCheckAt < 60_000) return;
        lastSwCheckAt = now;
        void registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', checkForUpdate);
      window.addEventListener('focus', checkForUpdate);
    },
    onOfflineReady() {
      // Service worker precache complete
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
