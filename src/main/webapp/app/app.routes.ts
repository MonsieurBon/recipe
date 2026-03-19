import { Routes } from '@angular/router';
import { Login } from './security/login/login';
import { Register } from './security/register/register';
import { RegisterSuccess } from './security/register-success/register-success';

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
  {
    title: 'Rezepte - Registrierung erfolgreich',
    path: 'register/success',
    component: RegisterSuccess,
  },
];
