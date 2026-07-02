import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  provideZonelessChangeDetection
} from '@angular/core';
import {provideHttpClient, withFetch} from '@angular/common/http';

import { CODE_GENERATION_STRATEGIES } from './domain/schema-management/services/code-generator.service';
import { RStrategy } from './domain/schema-management/services/generation/r.strategy';
import { PythonStrategy } from './domain/schema-management/services/generation/python.strategy';
import { SasStrategy } from './domain/schema-management/services/generation/sas.strategy';
import { StataStrategy } from './domain/schema-management/services/generation/stata.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    { provide: CODE_GENERATION_STRATEGIES, useClass: RStrategy, multi: true },
    { provide: CODE_GENERATION_STRATEGIES, useClass: PythonStrategy, multi: true },
    { provide: CODE_GENERATION_STRATEGIES, useClass: SasStrategy, multi: true },
    { provide: CODE_GENERATION_STRATEGIES, useClass: StataStrategy, multi: true },
  ],
};
