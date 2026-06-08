import {bootstrapApplication} from '@angular/platform-browser';
import {App} from './app/app';
import {appConfig} from './app/app.config';
import {LoggingService} from './app/core/services/logging.service';

bootstrapApplication(App, appConfig).catch((err) => {
  const logger = new LoggingService();
  logger.error(err);
});
