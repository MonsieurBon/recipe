import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { disabled, email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  imports: [
    MatCardContent,
    MatCardTitle,
    MatCardHeader,
    MatCard,
    MatError,
    MatFormField,
    MatInput,
    FormField,
    FormRoot,
    MatLabel,
    MatButton,
    MatProgressSpinner,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private authService = inject(AuthService);

  private readonly errorMessages: Record<string, Record<string, string>> = {
    username: {
      required: 'Benutzername ist erforderlich',
      duplicate: 'Benutzername ist bereits vergeben',
    },
    email: {
      required: 'Email ist erforderlich',
      invalid: 'Email ist ungültig',
      duplicate: 'Email ist bereits vergeben',
    },
    password: {
      required: 'Passwort ist erforderlich',
    },
  };

  registerModel = signal({
    username: '',
    email: '',
    password: '',
  });

  registerForm = form(
    this.registerModel,
    (schemaPath) => {
      disabled(schemaPath, (ctx) => ctx.fieldTree().submitting());
      required(schemaPath.username, { message: this.errorMessages['username']['required'] });
      required(schemaPath.email, { message: this.errorMessages['email']['required'] });
      email(schemaPath.email, { message: this.errorMessages['email']['invalid'] });
      required(schemaPath.password, { message: this.errorMessages['password']['required'] });
    },
    {
      submission: {
        action: async (field) => {
          const result = await this.authService.register(this.registerModel());
          if (typeof result === 'boolean') {
            return;
          }

          return result.conflictingFields.map((f) => ({
            kind: 'duplicate',
            message: this.errorMessages[f]['duplicate'],
            fieldTree: field[f as keyof typeof field] as never,
          }));
        },
      },
    },
  );
}
