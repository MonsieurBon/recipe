import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, EMPTY } from 'rxjs';

import { BottomSheet } from '../../utility/bottom-sheet';
import { NotificationService } from '../../utility/notification.service';
import { AdminService, AdminUser, roleOf, UserRole } from '../admin.service';
import { conflictNoticeKey } from './user-conflict';

export interface UserEditSheetData {
  user: AdminUser;
  isOwn: boolean;
}

/**
 * Compact-viewport editor for a single user, opened by tapping a row. It holds the Aktiv toggle and
 * the Rolle select (the delete action joins them in a later slice); each persists on change, and
 * the list behind refreshes when the sheet closes. An admin can neither deactivate nor demote their
 * own account, so both controls are disabled on the signed-in admin's own row (the server enforces
 * the same rules).
 */
@Component({
  selector: 'app-user-edit-sheet',
  imports: [
    BottomSheet,
    MatFormField,
    MatLabel,
    MatOption,
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
  private readonly notification = inject(NotificationService);
  protected readonly data = inject<UserEditSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected readonly enabled = signal(this.data.user.enabled);
  protected readonly role = signal(roleOf(this.data.user));

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
}
