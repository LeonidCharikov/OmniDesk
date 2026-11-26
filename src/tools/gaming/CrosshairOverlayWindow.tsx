import React, { useEffect, useState } from 'react';
import {
  CrosshairConfig,
  CrosshairOverlayStatus,
  DEFAULT_CROSSHAIR_CONFIG,
  sanitizeCrosshairConfig,
} from './crosshair.logic';
import { CrosshairSvg } from './CrosshairSvg';

const STORAGE_KEY = 'omnidesk_crosshair_active_v1';

function loadFallbackConfig(): CrosshairConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CROSSHAIR_CONFIG;
    return sanitizeCrosshairConfig(JSON.parse(raw) as Partial<CrosshairConfig>);
  } catch {
    return DEFAULT_CROSSHAIR_CONFIG;
  }
}

export const CrosshairOverlayWindow: React.FC = () => {
  const [config, setConfig] = useState<CrosshairConfig>(loadFallbackConfig);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.width = '100vw';
    document.documentElement.style.height = '100vh';
    document.documentElement.style.overflow = 'hidden';

    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';

    const root = document.getElementById('root');
    if (root) {
      root.style.background = 'transparent';
      root.style.width = '100vw';
      root.style.height = '100vh';
      root.style.display = 'flex';
      root.style.alignItems = 'center';
      root.style.justifyContent = 'center';
      root.style.overflow = 'hidden';
      root.style.pointerEvents = 'none';
      root.style.userSelect = 'none';
    }

    let unlisten: (() => void) | null = null;
    let disposed = false;

    const isTauriRuntime =
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    if (isTauriRuntime) {
      void import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke<CrosshairOverlayStatus>('desktop_crosshair_status'))
        .then(status => {
          if (disposed || !status.config_json) return;
          try {
            setConfig(
              sanitizeCrosshairConfig(JSON.parse(status.config_json) as Partial<CrosshairConfig>)
            );
          } catch {
            // ignore invalid json
          }
        })
        .catch(() => {});

      void import('@tauri-apps/api/event')
        .then(async ({ listen }) => {
          if (disposed) return;
          const stop = await listen<string>('omnidesk:crosshair-config', event => {
            if (typeof event.payload !== 'string') return;
            try {
              setConfig(
                sanitizeCrosshairConfig(JSON.parse(event.payload) as Partial<CrosshairConfig>)
              );
            } catch {
              // ignore invalid payload
            }
          });
          if (disposed) {
            stop();
          } else {
            unlisten = stop;
          }
        })
        .catch(() => {});
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setConfig(sanitizeCrosshairConfig(JSON.parse(e.newValue) as Partial<CrosshairConfig>));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return <CrosshairSvg config={config} size={220} />;
};

