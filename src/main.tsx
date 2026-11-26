const rootEl = document.getElementById('root')!;

const isCrosshairOverlayWindow =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('window') === 'crosshair-overlay';

if (isCrosshairOverlayWindow) {
  void Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./tools/gaming/CrosshairOverlayWindow'),
  ]).then(([{ createElement }, { createRoot }, { CrosshairOverlayWindow }]) => {
    createRoot(rootEl).render(createElement(CrosshairOverlayWindow));
  });
} else {
  void import('./bootstrapApp').then(({ mountMainApp }) => {
    mountMainApp(rootEl);
  });
}

export {};


