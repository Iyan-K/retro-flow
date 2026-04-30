import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { MemoryLaneComponent } from './components/memory-lane/memory-lane';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'memory-lane', component: MemoryLaneComponent },
  { path: '**', redirectTo: '' },
];
