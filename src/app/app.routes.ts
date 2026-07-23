import { Type } from '@angular/core';
import { LandingComponent } from './features/landing/landing.component';
import { AboutComponent } from './features/about/about.component';
import { GeneratorComponent } from './domain/study-builder/components/generator.component';
import { SchemaVerificationComponent } from './domain/schema-management/components/schema-verification.component';
import { ExceptionReportComponent } from './features/exception-report/exception-report.component';

export interface Route {
  path: string;
  component?: Type<any>;
  title?: string;
  redirectTo?: string;
  pathMatch?: 'full' | 'prefix';
}

export const routes: Route[] = [
  { path: '', component: LandingComponent, title: 'Equipose - Clinical Trial Randomization Tool', pathMatch: 'full' },
  { path: 'about', component: AboutComponent, title: 'About | Equipose' },
  { path: 'generator', component: GeneratorComponent, title: 'Randomization Generator | Equipose' },
  { path: 'verify', component: SchemaVerificationComponent, title: 'Verify Schema | Equipose' },
  { path: 'exception-report', component: ExceptionReportComponent, title: 'SAS & Stata Exception Report | Equipose' },
  { path: '**', redirectTo: '' }
];
