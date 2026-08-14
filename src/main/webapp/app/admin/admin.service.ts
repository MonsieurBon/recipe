import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  roles: string[];
}

export interface UserPage {
  content: AdminUser[];
  totalElements: number;
  number: number;
  size: number;
}

interface PagedResponse {
  content: AdminUser[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

/**
 * The single role an admin picks for a user. The server stores a set and every account keeps the
 * base `USER` role, so this is the editable part of that set rather than the set itself.
 */
export type UserRole = 'USER' | 'ADMIN';

/** The full editable state of a user, submitted together on every change. */
export interface UserUpdate {
  enabled: boolean;
  role: UserRole;
}

/** Reduces a user's stored role set to the single role the admin UI edits. */
export function roleOf(user: AdminUser): UserRole {
  return user.roles.includes('ADMIN') ? 'ADMIN' : 'USER';
}

/** The columns the admin user list may be ordered by, named as the response fields. */
export type UserSortColumn = 'username' | 'email' | 'enabled';
export type UserSortDirection = 'asc' | 'desc';

/** A sort in Spring Data's `property,direction` form, or undefined for the server default. */
export type UserSort = undefined | `${UserSortColumn},${UserSortDirection}`;

/**
 * A page request for the admin user list. Beyond paging it carries the optional free-text term, the
 * sort, and the admins-only filter; each is sent as a query param only when it actually narrows the
 * result.
 */
export interface UserQuery {
  page: number;
  size: number;
  search?: string;
  sort?: UserSort;
  adminsOnly?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);

  searchUsers(query: UserQuery): Observable<UserPage> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    if (query.search) {
      params = params.set('q', query.search);
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    if (query.adminsOnly) {
      params = params.set('admins', true);
    }
    return this.http.get<PagedResponse>('/api/admin/users', { params }).pipe(
      map((response) => ({
        content: response.content,
        totalElements: response.page.totalElements,
        number: response.page.number,
        size: response.page.size,
      })),
    );
  }

  /**
   * Persists a user's editable state. Both fields go on every request: the server compares them
   * against what it has stored to decide what actually changed, and judges its admin guards on the
   * resulting state rather than on either field alone.
   */
  updateUser(id: number, changes: UserUpdate): Observable<AdminUser> {
    return this.http.put<AdminUser>(`/api/admin/users/${id}`, changes);
  }

  /** Removes a user's account for good. */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`/api/admin/users/${id}`);
  }
}
