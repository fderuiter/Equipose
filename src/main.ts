import {bootstrapApplication} from '@angular/platform-browser';
import {ApplicationRef, isDevMode} from '@angular/core';
import {first} from 'rxjs';
import {App} from './app/app';
import {appConfig} from './app/app.config';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
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
