import { Type } from '@angular/core';
import { LandingComponent } from './features/landing/landing.component';
import { AboutComponent } from './features/about/about.component';
import { GeneratorComponent } from './domain/study-builder/components/generator.component';
import { SchemaVerificationComponent } from './domain/schema-management/components/schema-verification.component';

export interface Route {
  path: string;
  component?: Type<any>;
  title?: string;
  redirectTo?: string;
}

export const routes: Route[] = [
  { path: '', component: LandingComponent, title: 'Equipose - Clinical Trial Randomization Tool' },
  { path: 'about', component: AboutComponent, title: 'About | Equipose' },
  { path: 'generator', component: GeneratorComponent, title: 'Randomization Generator | Equipose' },
  { path: 'verify', component: SchemaVerificationComponent, title: 'Verify Schema | Equipose' },
  { path: '**', redirectTo: '' }
];
