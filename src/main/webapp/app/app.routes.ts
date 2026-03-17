import { Routes } from '@angular/router';
import { Login } from './security/login/login';
import { Register } from './security/register/register';

export const routes: Routes = [
  {
    title: 'Rezepte - Login',
    path: 'login',
    component: Login,
  },
  {
    title: 'Rezepte - Registrieren',
    path: 'register',
    component: Register,
  },
];
