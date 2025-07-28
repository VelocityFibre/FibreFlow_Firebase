import { Routes } from '@angular/router';
import { MaterialListComponent } from './components/material-list/material-list.component';
import { MaterialFormComponent } from './components/material-form/material-form.component';

export const materialRoutes: Routes = [
  { path: '', component: MaterialListComponent },
  { path: 'new', component: MaterialFormComponent },
  { path: 'edit/:id', component: MaterialFormComponent }
];