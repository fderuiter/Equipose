import {Routes} from '@angular/router';
import {LandingComponent} from './landing.component';
import {AboutComponent} from './about.component';
import {GeneratorComponent} from './generator.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'about', component: AboutComponent },
  { path: 'generator', component: GeneratorComponent },
  { path: '**', redirectTo: '' }
];
