import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

/** What a destructive action asks before it runs. Every text is a translation key. */
export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  /** Fills the placeholders in the title and the message. */
  messageParams?: Record<string, unknown>;
  /** Names the destructive act itself — «Löschen», not «OK». */
  confirmKey: string;
}

/**
 * The question every destructive action asks first: it states what is about to be destroyed and
 * closes on the answer, {@code true} for approved and nothing at all for cancelled.
 *
 * <p>Carrying the action out belongs to whoever opened the dialog, and so does whatever the server
 * answers — a refusal is shown in the editor the action came from, where the user can act on it.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButton, MatDialogActions, MatDialogContent, MatDialogTitle, TranslatePipe],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog, boolean>);

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
