import {bootstrapApplication} from '@angular/platform-browser';
import {ApplicationRef, isDevMode} from '@angular/core';
import {first} from 'rxjs';
import {App} from './app/app';
import {appConfig} from './app/app.config';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    if (isDevMode()) {
      // Integrated in-browser accessibility audit tool
      import('axe-core').then((axe) => {
        setTimeout(() => {
          axe.default.run().then(results => {
            if (results.violations.length) {
              console.warn('Axe-core accessibility violations:', results.violations);
            }
          });
          
          // Set up a MutationObserver to re-run on significant DOM changes
          const observer = new MutationObserver((mutations) => {
            const significant = mutations.some(m => 
              m.addedNodes.length > 0 && 
              m.target.nodeName !== 'A11Y-ANNOUNCER' &&
              (m.target as Element).getAttribute?.('aria-live') !== 'polite'
            );
            if (significant) {
              axe.default.run().then(results => {
                if (results.violations.length) {
                  console.warn('Axe-core accessibility violations (dynamic):', results.violations);
                }
              });
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }, 1000);
      }).catch(err => console.error('Failed to load axe-core:', err));
    }

    if (!isDevMode() && 'serviceWorker' in navigator) {
      const applicationRef = appRef.injector.get(ApplicationRef);
      applicationRef.isStable.pipe(first((isStable) => isStable)).subscribe(() => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          registration.update();
        }).catch((err) => console.error('Service worker registration failed:', err));
      });
    }
  })
  .catch((err) => console.error(err));
