import { Routes } from '@angular/router';
import { adminGuard } from './admin/admin-guard';
import { loggedInGuard } from './security/logged-in-guard';

// Route titles are translation keys; TranslatedTitleStrategy renders them as "{app name} - {page}"
// in the active language.
export const routes: Routes = [
  {
    title: 'app.account',
    path: 'konto',
    loadComponent: () => import('./konto/konto').then((m) => m.Konto),
    canActivate: [loggedInGuard],
  },
  {
    title: 'app.login',
    path: 'login',
    loadComponent: () => import('./security/login/login').then((m) => m.Login),
  },
  {
    title: 'logoutFailed.title',
    path: 'logout-failed',
    loadComponent: () =>
      import('./security/logout-failed/logout-failed').then((m) => m.LogoutFailed),
  },
  {
    title: 'app.register',
    path: 'register',
    loadComponent: () => import('./security/register/register').then((m) => m.Register),
  },
  {
    title: 'registerSuccess.title',
    path: 'register/success',
    loadComponent: () =>
      import('./security/register-success/register-success').then((m) => m.RegisterSuccess),
  },
  {
    title: 'app.administration',
    path: 'admin',
    loadComponent: () => import('./admin/admin-shell').then((m) => m.AdminShell),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        title: 'admin.users',
        path: 'users',
        loadComponent: () => import('./admin/users/admin-users').then((m) => m.AdminUsers),
      },
      { path: '**', redirectTo: 'users' },
    ],
  },
];
