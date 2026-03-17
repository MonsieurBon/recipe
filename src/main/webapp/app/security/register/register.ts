import { Component, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  imports: [
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    MatFormField,
    MatInput,
    FormField,
    FormRoot,
    MatLabel,
    MatButton,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private authService = inject(AuthService);

  registerModel = signal({
    username: '',
    email: '',
    password: '',
  });

  registerForm = form(this.registerModel, {
    submission: {
      action: async () => {
        this.submit();
      },
    },
  });

  submit() {
    this.authService.register(this.registerModel());
  }
}
