import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';

export interface RegistrationDetails {
  username: string;
  email: string;
  password: string;
}

export interface DuplicateUserError {
  conflictingFields: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  async register(details: RegistrationDetails): Promise<DuplicateUserError | boolean> {
    return firstValueFrom(
      this.http.post('/api/auth/register', details).pipe(
        switchMap(() => this.router.navigate(['register', 'success'])),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 409) {
            return of(error.error as DuplicateUserError);
          }
          throw error;
        }),
      ),
    );
  }
}
