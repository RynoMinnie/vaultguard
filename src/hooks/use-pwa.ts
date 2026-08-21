'use client';

import { useEffect } from 'react';

// Match basePath from next.config.ts — GitHub Pages serves at /vaultguard/
// Change this if your repo name differs. Remove if deploying to root domain.
const BASE_PATH = '/vaultguard';

export function usePWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register(`${BASE_PATH}/sw.js`)
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  }, []);
}
