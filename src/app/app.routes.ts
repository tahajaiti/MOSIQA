import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'library',
        pathMatch: 'full',
      },
      {
        path: 'library',
        loadComponent: () =>
          import('@features/library/library.component').then((m) => m.LibraryComponent),
      },
      {
        path: 'track/:id',
        loadComponent: () =>
          import('@features/track/track.component').then((m) => m.TrackComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'library',
  },
];
