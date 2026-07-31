import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';

import { BottomSheet } from '../../utility/bottom-sheet';
import { UserSort } from '../admin.service';

/** Data handed to the compact sort-and-filter sheet. */
export interface UserSortSheetData {
  sort: UserSort;
  adminsOnly: boolean;
  applySort: (sort: UserSort) => void;
  setAdminsOnly: (adminsOnly: boolean) => void;
}

/** The six orderings offered in the sheet, each pairing a label key with its sort value. */
const SORT_OPTIONS: readonly { readonly labelKey: string; readonly sort: UserSort }[] = [
  { labelKey: 'admin.sort.usernameAsc', sort: 'username,asc' },
  { labelKey: 'admin.sort.usernameDesc', sort: 'username,desc' },
  { labelKey: 'admin.sort.emailAsc', sort: 'email,asc' },
  { labelKey: 'admin.sort.emailDesc', sort: 'email,desc' },
  { labelKey: 'admin.sort.activeFirst', sort: 'enabled,desc' },
  { labelKey: 'admin.sort.disabledFirst', sort: 'enabled,asc' },
];

/**
 * Compact-viewport sort-and-filter picker, opened from the sort button beside the search. Choosing
 * an ordering applies it and dismisses the sheet; the Nur-Admins toggle applies immediately and
 * leaves the sheet open. Both act through callbacks on the sheet data, so the list owns the state.
 */
@Component({
  selector: 'app-user-sort-sheet',
  imports: [BottomSheet, MatIcon, MatSlideToggle, TranslatePipe],
  templateUrl: './user-sort-sheet.html',
  styleUrl: './user-sort-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSortSheet {
  private readonly sheetRef = inject(MatBottomSheetRef);
  protected readonly data = inject<UserSortSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected readonly options = SORT_OPTIONS;
  protected readonly adminsOnly = signal(this.data.adminsOnly);

  protected isSelected(sort: UserSort): boolean {
    return this.data.sort === sort;
  }

  protected choose(sort: UserSort): void {
    this.data.applySort(sort);
    this.sheetRef.dismiss();
  }

  protected toggleAdmins(change: MatSlideToggleChange): void {
    this.adminsOnly.set(change.checked);
    this.data.setAdminsOnly(change.checked);
  }
}
