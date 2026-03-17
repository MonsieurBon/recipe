import { HttpInterceptorFn } from '@angular/common/http';
import { LocalStorage } from '../utility/local-storage';
import { inject } from '@angular/core';

export const authenticationInterceptor: HttpInterceptorFn = (req, next) => {
  const localStorageService = inject(LocalStorage);

  const jwt = localStorageService.getItem('jwt');

  if (!jwt) {
    return next(req);
  }

  return next(
    req.clone({
      headers: req.headers.set('Authorization', `Bearer ${jwt}`),
    }),
  );
};
