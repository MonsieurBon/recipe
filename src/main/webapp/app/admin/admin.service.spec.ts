import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searchUsers requests the given page and maps content plus total count', async () => {
    const promise = firstValueFrom(service.searchUsers({ page: 1, size: 20 }));

    const req = httpMock.expectOne('/api/admin/users?page=1&size=20');
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [
        {
          id: 1,
          username: 'alice',
          email: 'alice@example.com',
          enabled: true,
          roles: ['USER', 'ADMIN'],
        },
        { id: 2, username: 'bob', email: 'bob@example.com', enabled: false, roles: ['USER'] },
      ],
      page: { size: 20, number: 1, totalElements: 42, totalPages: 3 },
    });

    const result = await promise;
    expect(result.totalElements).toBe(42);
    expect(result.number).toBe(1);
    expect(result.size).toBe(20);
    expect(result.content).toEqual([
      {
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        enabled: true,
        roles: ['USER', 'ADMIN'],
      },
      { id: 2, username: 'bob', email: 'bob@example.com', enabled: false, roles: ['USER'] },
    ]);
  });

  it('searchUsers adds q, sort and admins query params when filters are given', async () => {
    firstValueFrom(
      service.searchUsers({
        page: 0,
        size: 10,
        search: 'ali',
        sort: 'username,asc',
        adminsOnly: true,
      }),
    );

    const req = httpMock.expectOne(
      '/api/admin/users?page=0&size=10&q=ali&sort=username,asc&admins=true',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it('searchUsers omits filter params that are absent, empty or false', async () => {
    firstValueFrom(service.searchUsers({ page: 0, size: 10, search: '', adminsOnly: false }));

    const req = httpMock.expectOne('/api/admin/users?page=0&size=10');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it('setEnabled PUTs the flag and returns the updated user', async () => {
    const promise = firstValueFrom(service.setEnabled(5, false));

    const req = httpMock.expectOne('/api/admin/users/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush({
      id: 5,
      username: 'mytest',
      email: 'my@test.ch',
      enabled: false,
      roles: ['USER'],
    });

    expect(await promise).toEqual({
      id: 5,
      username: 'mytest',
      email: 'my@test.ch',
      enabled: false,
      roles: ['USER'],
    });
  });
});
