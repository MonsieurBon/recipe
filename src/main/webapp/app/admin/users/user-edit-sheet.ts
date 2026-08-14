import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, EMPTY, finalize } from 'rxjs';

import { BottomSheet } from '../../utility/bottom-sheet';
import { ConfirmDialog, ConfirmDialogData } from '../../utility/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../utility/notification.service';
import { AdminService, AdminUser, roleOf, UserRole } from '../admin.service';
import { conflictNoticeKey } from './user-conflict';

export interface UserEditSheetData {
  user: AdminUser;
  isOwn: boolean;
}

/**
 * Compact-viewport editor for a single user, opened by tapping a row. It holds the Aktiv toggle,
 * the Rolle select and the delete action; the two controls persist on change, and the list behind
 * refreshes when the sheet closes. An admin can neither deactivate, demote nor delete their own
 * account, so every control is disabled on the signed-in admin's own row (the server enforces the
 * same rules).
 */
@Component({
  selector: 'app-user-edit-sheet',
  imports: [
    BottomSheet,
    MatButton,
    MatFormField,
    MatOption,
    MatProgressSpinner,
    MatSelect,
    MatSlideToggle,
    TranslatePipe,
  ],
  templateUrl: './user-edit-sheet.html',
  styleUrl: './user-edit-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditSheet {
  private readonly adminService = inject(AdminService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly sheetRef = inject(MatBottomSheetRef);
  protected readonly data = inject<UserEditSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected readonly enabled = signal(this.data.user.enabled);
  protected readonly role = signal(roleOf(this.data.user));

  // Why the server refused the deletion, shown in the sheet the action was taken from; null while
  // nothing has been refused.
  protected readonly refusal = signal<string | null>(null);

  // True while the deletion is on the wire, which both reports progress and holds the action: a
  // second confirmed deletion would ask the server for a user that is already gone, and that 404
  // reaches the admin as the generic error rather than as anything they can act on.
  protected readonly deleting = signal(false);

  protected toggleEnabled(change: MatSlideToggleChange): void {
    const previous = this.enabled();
    this.enabled.set(change.checked);
    this.persist(() => this.enabled.set(previous));
  }

  protected changeRole(change: MatSelectChange<UserRole>): void {
    const previous = this.role();
    this.role.set(change.value);
    this.persist(() => this.role.set(previous));
  }

  /**
   * Submits the sheet's current state and reconciles both controls with the server's answer. The
   * controls flip optimistically, so a rejected change has to be undone: `revert` restores the one
   * the user just touched, leaving the other alone.
   */
  private persist(revert: () => void): void {
    this.adminService
      .updateUser(this.data.user.id, { enabled: this.enabled(), role: this.role() })
      .pipe(
        catchError((error: unknown) => {
          // Undo the optimistic change; a recognized conflict shows its dedicated message, anything
          // else rethrows to the global handler as an unexpected failure.
          revert();
          const noticeKey = conflictNoticeKey(error);
          if (noticeKey) {
            this.notification.showNotice(noticeKey);
            return EMPTY;
          }
          throw error;
        }),
      )
      .subscribe((updated) => {
        this.enabled.set(updated.enabled);
        this.role.set(roleOf(updated));
      });
  }

  /**
   * Asks first, then deletes. The dialog only answers the question; what the server makes of the
   * deletion is settled here, where the user still has the account in front of them: a refusal is
   * stated in the sheet, and only a deletion that went through closes it — the list behind reloads
   * on dismissal and would otherwise still show the row.
   */
  protected deleteUser(): void {
    const data: ConfirmDialogData = {
      titleKey: 'admin.deleteUser.title',
      messageKey: 'admin.deleteUser.message',
      messageParams: { username: this.data.user.username },
      confirmKey: 'admin.deleteUser.action',
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.persistDeletion();
        }
      });
  }

  private persistDeletion(): void {
    this.refusal.set(null);
    this.deleting.set(true);
    this.adminService
      .deleteUser(this.data.user.id)
      .pipe(
        finalize(() => this.deleting.set(false)),
        catchError((error: unknown) => {
          // A recognized conflict is an expected answer the admin can act on, so it stays with the
          // account it concerns; anything else rethrows to the global handler.
          const noticeKey = conflictNoticeKey(error);
          if (noticeKey) {
            this.refusal.set(noticeKey);
            return EMPTY;
          }
          throw error;
        }),
      )
      // Only a deletion that actually happened emits; a refusal completes the stream without a
      // value, which is what keeps the sheet open behind its message.
      .subscribe(() => this.sheetRef.dismiss());
  }
}
