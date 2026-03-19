import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-success',
  imports: [MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatButton, RouterLink],
  templateUrl: './register-success.html',
  styleUrl: './register-success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterSuccess {}
