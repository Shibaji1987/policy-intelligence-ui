import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then((module) => module.ChatPageComponent),
    title: 'Chat | Policy Intelligence'
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/documents/documents-page.component').then(
        (module) => module.DocumentsPageComponent
      ),
    title: 'Admin | Policy Intelligence'
  },
  { path: '**', redirectTo: '' }
];
