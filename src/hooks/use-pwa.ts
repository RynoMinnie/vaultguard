'use client';

import { useEffect } from 'react';

export function usePWA() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Get basePath from Next.js runtime data (empty string if none)
    const basePath = (window as unknown as { __NEXT_DATA__: { basePath?: string } }).__NEXT_DATA__?.basePath || '';

    navigator.serviceWorker
      .register(`${basePath}/sw.js`)
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  }, []);
}