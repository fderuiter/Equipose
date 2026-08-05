import {bootstrapApplication} from '@angular/platform-browser';
import {isDevMode} from '@angular/core';
import {App} from './app/app';
import {appConfig} from './app/app.config';

bootstrapApplication(App, appConfig)
  .then(() => {
    if (isDevMode()) {
      // Integrated in-browser accessibility audit tool
      import('axe-core').then((axe) => {
        let isAxeRunning = false;
        let axeTimeout: any;

        const runAxe = (label: string) => {
          if (isAxeRunning) return;
          isAxeRunning = true;
          axe.default.run().then(results => {
            if (results.violations.length) {
              console.warn('Axe-core accessibility violations %s:', label, results.violations);
            }
          }).catch(() => {}).finally(() => {
            isAxeRunning = false;
          });
        };

        setTimeout(() => {
          runAxe('');
          
          const observer = new MutationObserver((mutations) => {
            const significant = mutations.some(m => 
              m.addedNodes.length > 0 && 
              m.target.nodeName !== 'A11Y-ANNOUNCER' &&
              (m.target as Element).getAttribute?.('aria-live') !== 'polite'
            );
            if (significant) {
              clearTimeout(axeTimeout);
              axeTimeout = setTimeout(() => runAxe(' (dynamic)'), 500);
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }, 1000);
      }).catch(err => console.error('Failed to load axe-core:', err));
    }

    const isTestOrDev = typeof window !== 'undefined' && (
      (typeof navigator !== 'undefined' && navigator.webdriver) ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1' ||
      window.location.hostname === '0.0.0.0' ||
      window.location.hostname.endsWith('.localhost')
    );

    if (!isDevMode() && 'serviceWorker' in navigator && !isTestOrDev) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          registration.update();
        }).catch((err) => console.error('Service worker registration failed:', err));
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(registerSW);
      } else {
        setTimeout(registerSW, 1000);
      }
    }
  })
  .catch((err) => console.error(err));
