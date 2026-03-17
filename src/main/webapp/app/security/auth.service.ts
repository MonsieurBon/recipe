import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface RegistrationDetails {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  register(details: RegistrationDetails) {
    this.http.post('/api/auth/register', details).subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }
}
