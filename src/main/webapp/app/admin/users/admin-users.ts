import { NgTemplateOutlet, TitleCasePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ErrorHandler,
  inject,
  linkedSignal,
  signal,
  Signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatFormField, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSort, MatSortHeader, Sort, SortDirection } from '@angular/material/sort';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { TranslatePipe } from '@ngx-translate/core';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  finalize,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { AuthService } from '../../security/auth.service';
import { LayoutService } from '../../utility/layout.service';
import { NotificationService } from '../../utility/notification.service';
import { AdminService, AdminUser, UserPage, UserSort } from '../admin.service';
import { conflictNoticeKey } from './user-conflict';
import { UserEditSheet } from './user-edit-sheet';
import { UserSortSheet, UserSortSheetData } from './user-sort-sheet';

const DEFAULT_PAGE_SIZE = 10;

// Idle after a keystroke before the term reaches the server, so typing fires one query rather than
// one per character.
const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'app-admin-users',
  imports: [
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatFormField,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatIconButton,
    MatInput,
    MatPaginator,
    MatPrefix,
    MatRow,
    MatRowDef,
    MatSlideToggle,
    MatSort,
    MatSortHeader,
    MatTable,
    NgTemplateOutlet,
    TitleCasePipe,
    UpperCasePipe,
    TranslatePipe,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private bottomSheet = inject(MatBottomSheet);
  private errorHandler = inject(ErrorHandler);
  private layoutService = inject(LayoutService);
  private notification = inject(NotificationService);

  protected readonly isCompact = this.layoutService.isCompact;
  protected readonly columns = ['username', 'email', 'active', 'roles'];
  protected readonly pageSizeOptions = [10, 20, 50];

  // Bumped to force a re-fetch of the current page after a change (an enabled toggle, or the edit
  // sheet closing), so the list reconciles with what the server actually stored.
  private readonly reload = signal(0);

  // The free-text term, the sort (undefined for the server default) and the admins-only filter. Any
  // change to one returns the list to the first page, so a narrowed result never keeps stale page
  // offsets.
  protected readonly search = signal('');
  protected readonly sort = signal<UserSort>(undefined);
  protected readonly adminsOnly = signal(false);

  // The sort split into MatSort's inputs, so the header arrows are driven by the signal rather than
  // MatSort's own click state. This keeps the indicator in step when the sort was chosen in the
  // compact sheet and the table is later rebuilt on a resize past the compact breakpoint.
  protected readonly sortActive = computed(() => this.sort()?.split(',')[0] ?? '');
  protected readonly sortDirection = computed<SortDirection>(
    () => (this.sort()?.split(',')[1] as SortDirection) ?? '',
  );

  // The term drives the input immediately but reaches the query only after a pause, so a burst of
  // keystrokes fires one request. The reset to the first page rides along in the tap, so it happens
  // once the debounced term settles rather than on every character.
  private readonly appliedSearch = toSignal(
    toObservable(this.search).pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      tap(() => this.toFirstPage()),
    ),
    { initialValue: '' },
  );

  private readonly request = computed(() => ({
    page: this.pageIndex(),
    size: this.pageSize(),
    search: this.appliedSearch(),
    sort: this.sort(),
    adminsOnly: this.adminsOnly(),
    reload: this.reload(),
  }));
  private readonly result: Signal<UserPage> = toSignal(
    toObservable(this.request).pipe(
      switchMap((request) =>
        this.adminService
          .searchUsers({
            page: request.page,
            size: request.size,
            search: request.search,
            sort: request.sort,
            adminsOnly: request.adminsOnly,
          })
          .pipe(
            // Keep the long-lived stream alive when a fetch fails; otherwise a single error would end
            // it and silently stop all further paging. Re-emit the last successfully loaded page (a
            // fresh copy, so the reconcile re-runs and snaps the paginator back to it) rather than
            // blanking the table. The reconcile converges — it only refetches while the reconciled
            // page differs from the failed request — so a persistent failure settles, it does not
            // loop. The error still reaches the global handler (log + toast).
            catchError((error: unknown) => {
              this.errorHandler.handleError(error);
              return of<UserPage>({ ...this.result() });
            }),
          ),
      ),
    ),
    { initialValue: { content: [], totalElements: 0, number: 0, size: DEFAULT_PAGE_SIZE } },
  );

  // User-settable, but linked to the server's response: a page change writes these to drive the
  // fetch, and once the server answers they snap back to the page it actually served (e.g. a size
  // the backend capped), so the paginator can never drift from the response.
  protected readonly pageIndex = linkedSignal(() => this.result().number);
  protected readonly pageSize = linkedSignal(() => this.result().size);
  protected readonly users = computed(() => this.result().content);
  protected readonly total = computed(() => this.result().totalElements);

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected onSearch(term: string): void {
    this.search.set(term);
  }

  // The header's sort id is one of the response-field columns (username, email, enabled — the Aktiv
  // column is keyed to enabled), so the composed key is always a valid UserSort. Clearing the sort
  // (third click) drops back to the server default.
  protected onSortChange(sort: Sort): void {
    this.sort.set(sort.direction ? (`${sort.active},${sort.direction}` as UserSort) : undefined);
    this.toFirstPage();
  }

  protected toggleAdmins(): void {
    this.setAdminsOnly(!this.adminsOnly());
  }

  private setAdminsOnly(adminsOnly: boolean): void {
    this.adminsOnly.set(adminsOnly);
    this.toFirstPage();
  }

  // A new term, ordering or filter narrows the result, so its old page offset no longer applies.
  // The page index feeds the request signal, so resetting it here — alongside the changed
  // criterion — drives a single new fetch of the first page from the backend.
  private toFirstPage(): void {
    this.pageIndex.set(0);
  }

  protected openSortSheet(): void {
    const data: UserSortSheetData = {
      sort: this.sort(),
      adminsOnly: this.adminsOnly(),
      applySort: (sort) => this.applySort(sort),
      setAdminsOnly: (adminsOnly) => this.setAdminsOnly(adminsOnly),
    };
    this.bottomSheet.open(UserSortSheet, { data });
  }

  private applySort(sort: UserSort): void {
    this.sort.set(sort);
    this.toFirstPage();
  }

  // The signed-in admin cannot deactivate their own account, so their own row's toggle is disabled.
  // Identity is the immutable id; the server enforces the same rule regardless of the client.
  protected isOwn(user: AdminUser): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  protected onToggle(user: AdminUser, change: MatSlideToggleChange): void {
    this.setEnabled(user.id, change.checked);
  }

  private setEnabled(id: number, enabled: boolean): void {
    this.adminService
      .setEnabled(id, enabled)
      .pipe(
        catchError((error: unknown) => {
          // A recognized conflict is expected and shows its dedicated message; anything else
          // rethrows to the global handler. Either way the reload below snaps the row back to the
          // server's truth.
          const noticeKey = conflictNoticeKey(error);
          if (noticeKey) {
            this.notification.showNotice(noticeKey);
            return EMPTY;
          }
          throw error;
        }),
        finalize(() => this.reload.update((n) => n + 1)),
      )
      .subscribe();
  }

  protected openEditSheet(user: AdminUser): void {
    this.bottomSheet
      .open(UserEditSheet, { data: { user, isOwn: this.isOwn(user) } })
      .afterDismissed()
      .subscribe(() => this.reload.update((n) => n + 1));
  }
}
