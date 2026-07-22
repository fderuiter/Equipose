import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  provideZonelessChangeDetection,
  ErrorHandler
} from '@angular/core';
import {provideHttpClient, withFetch} from '@angular/common/http';

import { CODE_GENERATION_STRATEGIES } from './domain/schema-management/services/code-generator.service';
import { R_CONFIG } from './domain/schema-management/services/generation/r.strategy';
import { PYTHON_CONFIG } from './domain/schema-management/services/generation/python.strategy';
import { SAS_CONFIG } from './domain/schema-management/services/generation/sas.strategy';
import { STATA_CONFIG } from './domain/schema-management/services/generation/stata.strategy';
import { BaseOrchestrator } from './domain/schema-management/services/generation/base.strategy';
import { GlobalErrorHandler } from './core/errors/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: CODE_GENERATION_STRATEGIES, useFactory: () => new BaseOrchestrator(R_CONFIG), multi: true },
    { provide: CODE_GENERATION_STRATEGIES, useFactory: () => new BaseOrchestrator(PYTHON_CONFIG), multi: true },
    { provide: CODE_GENERATION_STRATEGIES, useFactory: () => new BaseOrchestrator(SAS_CONFIG), multi: true },
    { provide: CODE_GENERATION_STRATEGIES, useFactory: () => new BaseOrchestrator(STATA_CONFIG), multi: true },
  ],
};
