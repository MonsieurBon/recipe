import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

import { authenticationInterceptor } from './authentication-interceptor';
import { LocalStorage } from '../utility/local-storage';
import { Mocked } from 'vitest';
import { of } from 'rxjs';

describe('authenticationInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authenticationInterceptor(req, next));
  let localStorageServiceSpy: Mocked<LocalStorage>;

  beforeEach(() => {
    const spy: Mocked<LocalStorage> = { getItem: vi.fn(), setItem: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: LocalStorage, useValue: spy }],
    });

    localStorageServiceSpy = TestBed.inject(LocalStorage) as Mocked<LocalStorage>;
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should add the authentication header if JWT is present in localStorage', () => {
    localStorageServiceSpy.getItem.mockReturnValue('token');
    const httpRequest = new HttpRequest<unknown>('GET', '/api/test');
    let modifiedRequest: HttpRequest<unknown> = httpRequest;
    interceptor(httpRequest, (req) => {
      modifiedRequest = req;
      return of();
    });

    expect(modifiedRequest.headers.get('Authorization')).toEqual('Bearer token');
  });

  it('should not add the authentication header if JWT is not present in localStorage', () => {
    localStorageServiceSpy.getItem.mockReturnValue(null);
    const httpRequest = new HttpRequest<unknown>('GET', '/api/test');
    let modifiedRequest: HttpRequest<unknown> = httpRequest;
    interceptor(httpRequest, (req) => {
      modifiedRequest = req;
      return of();
    });

    expect(modifiedRequest.headers.has('Authorization')).toBe(false);
  });
});
