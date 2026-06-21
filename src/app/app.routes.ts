import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/documents/documents-page.component').then(
        (module) => module.DocumentsPageComponent
      ),
    title: 'Documents | Policy Intelligence'
  },
  { path: '**', redirectTo: '' }
];
