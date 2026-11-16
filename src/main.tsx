import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { I18nProvider } from './i18n/context';
import './index.css';

if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  !('__TAURI_INTERNALS__' in window)
) {
  registerSW({
    immediate: true,
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
