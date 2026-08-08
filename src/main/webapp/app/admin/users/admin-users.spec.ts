import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { of, throwError } from 'rxjs';
import { Mock } from 'vitest';

import { AuthService, CurrentUser } from '../../security/auth.service';
import { LayoutService } from '../../utility/layout.service';
import { NotificationService } from '../../utility/notification.service';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { AdminService, AdminUser, UserPage, UserQuery, UserUpdate } from '../admin.service';
import { AdminUsers } from './admin-users';
import { UserEditSheet } from './user-edit-sheet';
import { UserSortSheet, UserSortSheetData } from './user-sort-sheet';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;
  let isCompact: WritableSignal<boolean>;
  let currentUser: WritableSignal<CurrentUser | null>;
  let searchUsers: Mock<(query: UserQuery) => ReturnType<AdminService['searchUsers']>>;
  let updateUser: Mock<(id: number, changes: UserUpdate) => ReturnType<AdminService['updateUser']>>;
  let open: Mock;
  let showNotice: Mock<(key: string) => void>;
  let handleError: Mock<(error: unknown) => void>;

  const page = (
    content: UserPage['content'],
    totalElements: number,
    number: number,
    size: number,
  ): UserPage => ({ content, totalElements, number, size });

  const twoUsers: AdminUser[] = [
    {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      enabled: true,
      roles: ['USER', 'ADMIN'],
    },
    { id: 2, username: 'bob', email: 'bob@example.com', enabled: true, roles: ['USER'] },
  ];

  beforeEach(async () => {
    isCompact = signal(false);
    currentUser = signal<CurrentUser | null>(null);
    handleError = vi.fn();
    // The server echoes back the page it actually served, so the mock mirrors the request.
    searchUsers = vi.fn((query: UserQuery) => of(page(twoUsers, 42, query.page, query.size)));
    updateUser = vi.fn((id: number, changes: UserUpdate) =>
      of({
        id,
        username: 'x',
        email: 'x@example.com',
        enabled: changes.enabled,
        roles: changes.role === 'ADMIN' ? ['USER', 'ADMIN'] : ['USER'],
      }),
    );
    open = vi.fn(() => ({ afterDismissed: () => of(undefined) }));
    showNotice = vi.fn();

    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideTranslateTesting(),
        { provide: AdminService, useValue: { searchUsers, updateUser } },
        { provide: LayoutService, useValue: { isCompact } },
        { provide: AuthService, useValue: { currentUser } },
        { provide: MatBottomSheet, useValue: { open } },
        { provide: NotificationService, useValue: { showNotice } },
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    await fixture.whenStable();
  });

  const tags = (row: HTMLElement) =>
    Array.from(row.querySelectorAll('.tag')).map((tag) => tag.textContent!.trim());

  const paginator = () => fixture.debugElement.query(By.directive(MatPaginator)).componentInstance;

  it('renders one table row per user with username, email and an editable role on larger viewports', () => {
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('alice@example.com');
    expect(rows[1].textContent).toContain('bob');
    expect(rows[1].textContent).toContain('bob@example.com');

    // On the expanded table the role is edited inline, so it is a select rather than a static tag.
    expect(rows[0].querySelector('[data-test-id="roleSelect"]')).not.toBeNull();
    expect(tags(rows[0])).toEqual([]);

    expect(fixture.nativeElement.querySelector('[data-test-id="userRows"]')).toBeNull();
  });

  it('renders one list row per user with avatar, username, email and role tags on compact viewports', async () => {
    isCompact.set(true);
    await fixture.whenStable();

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '[data-test-id="userRows"] li',
    );
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.avatar')!.textContent!.trim()).toBe('A');
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('alice@example.com');
    expect(tags(rows[0])).toEqual(['User', 'Admin']);
    expect(rows[1].querySelector('.avatar')!.textContent!.trim()).toBe('B');
    expect(rows[1].textContent).toContain('bob');
    expect(rows[1].textContent).toContain('bob@example.com');
    expect(tags(rows[1])).toEqual(['User']);

    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('loads the first page on init', () => {
    expect(searchUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 10 }));
  });

  it('exposes the total count to the paginator', () => {
    expect(paginator().length).toBe(42);
    expect(paginator().pageSize).toBe(10);
  });

  it('re-queries the server when the page changes', async () => {
    searchUsers.mockClear();

    paginator().page.emit({ pageIndex: 2, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 2, size: 10 }));
  });

  it('reflects the page size the server actually used, not the requested one', async () => {
    // Server caps the size below what was asked for.
    searchUsers.mockImplementation((query: UserQuery) => of(page(twoUsers, 42, query.page, 100)));

    paginator().page.emit({ pageIndex: 0, pageSize: 200, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    expect(paginator().pageSize).toBe(100);
  });

  it('keeps the last successfully loaded page on screen when a fetch fails', async () => {
    searchUsers.mockReturnValueOnce(throwError(() => new Error('boom')));

    paginator().page.emit({ pageIndex: 1, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(paginator().pageIndex).toBe(0);
    expect(paginator().length).toBe(42);
  });

  it('does not refetch endlessly when requests keep failing', async () => {
    searchUsers.mockReturnValue(throwError(() => new Error('down')));
    searchUsers.mockClear();

    paginator().page.emit({ pageIndex: 1, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    // The failed target page plus a single re-sync of the last-good page, then it settles.
    expect(searchUsers.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('reports the error and keeps paging working after a failed request', async () => {
    searchUsers.mockReturnValueOnce(throwError(() => new Error('boom')));

    paginator().page.emit({ pageIndex: 1, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();

    expect(handleError).toHaveBeenCalled();

    searchUsers.mockClear();
    paginator().page.emit({ pageIndex: 2, pageSize: 10, length: 42, previousPageIndex: 1 });
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 2, size: 10 }));
  });

  it('hides the page-size select on compact viewports only', async () => {
    expect(paginator().hidePageSize).toBe(false);

    isCompact.set(true);
    await fixture.whenStable();

    expect(paginator().hidePageSize).toBe(true);
  });

  const toggleDebugElements = () => fixture.debugElement.queryAll(By.directive(MatSlideToggle));
  const roleSelectDebugElements = () => fixture.debugElement.queryAll(By.directive(MatSelect));

  // Forces a fresh fetch with the given content by changing the page size (which re-runs the
  // request), so a test can render users other than the default pair.
  const reloadWith = async (content: AdminUser[]) => {
    searchUsers.mockReturnValue(of(page(content, content.length, 0, 20)));
    paginator().page.emit({ pageIndex: 0, pageSize: 20, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();
  };

  it('marks a disabled account with a Deaktiviert tag and dims it on compact viewports', async () => {
    isCompact.set(true);
    await reloadWith([
      { id: 3, username: 'mytest', email: 'my@test.ch', enabled: false, roles: ['USER'] },
    ]);

    const row: HTMLElement = fixture.nativeElement.querySelector('[data-test-id="userRows"] li');
    expect(tags(row)).toEqual(['Deaktiviert']);
    expect(row.querySelector('.dis')).not.toBeNull();
  });

  it('opens the edit sheet for the tapped row, flagging the signed-in admin’s own row', async () => {
    currentUser.set({ id: 1, username: 'alice', email: 'alice@example.com' });
    isCompact.set(true);
    await fixture.whenStable();

    const rowButton: HTMLElement = fixture.nativeElement.querySelector('[data-test-id="userRow"]');
    rowButton.click();

    expect(open).toHaveBeenCalledWith(UserEditSheet, {
      data: { user: twoUsers[0], isOwn: true },
    });
  });

  it('re-fetches the current page after the edit sheet closes', async () => {
    isCompact.set(true);
    await fixture.whenStable();
    searchUsers.mockClear();

    fixture.nativeElement.querySelector('[data-test-id="userRow"]').click();
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalled();
  });

  it('disables only the signed-in admin’s own toggle in the expanded table', () => {
    currentUser.set({ id: 1, username: 'alice', email: 'alice@example.com' });
    fixture.detectChanges();

    const toggles = toggleDebugElements().map((d) => d.componentInstance as MatSlideToggle);
    expect(toggles[0].disabled).toBe(true); // alice is the signed-in admin
    expect(toggles[1].disabled).toBe(false);
  });

  it('gives each expanded-table toggle an accessible name naming its account', () => {
    const button: HTMLElement = fixture.nativeElement.querySelector(
      'tr[mat-row] [data-test-id="activeToggle"] button[role="switch"]',
    );
    expect(button.getAttribute('aria-label')).toContain('alice');
  });

  it('persists an inline toggle and re-fetches to reconcile', async () => {
    searchUsers.mockClear();

    toggleDebugElements()[1].triggerEventHandler('change', { checked: false });
    await fixture.whenStable();

    // bob holds only USER, and the toggle must carry that role along untouched.
    expect(updateUser).toHaveBeenCalledWith(2, { enabled: false, role: 'USER' });
    expect(searchUsers).toHaveBeenCalled();
  });

  it('persists an inline role change, keeping the account’s enabled state', async () => {
    searchUsers.mockClear();

    roleSelectDebugElements()[1].triggerEventHandler('selectionChange', { value: 'ADMIN' });
    await fixture.whenStable();

    expect(updateUser).toHaveBeenCalledWith(2, { enabled: true, role: 'ADMIN' });
    expect(searchUsers).toHaveBeenCalled();
  });

  it('shows each account’s current role in the inline select', () => {
    const selects = roleSelectDebugElements();

    expect((selects[0].componentInstance as MatSelect).value).toBe('ADMIN');
    expect((selects[1].componentInstance as MatSelect).value).toBe('USER');
  });

  it('disables the role select on the signed-in admin’s own row', () => {
    currentUser.set({ id: 1, username: 'alice', email: 'alice@example.com' });
    fixture.detectChanges();

    expect((roleSelectDebugElements()[0].componentInstance as MatSelect).disabled).toBe(true);
    expect((roleSelectDebugElements()[1].componentInstance as MatSelect).disabled).toBe(false);
  });

  it('shows a dedicated notice and does not log a conflict, then reconciles', async () => {
    updateUser.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { reason: 'lastActiveAdmin' } }),
      ),
    );
    searchUsers.mockClear();

    toggleDebugElements()[1].triggerEventHandler('change', { checked: false });
    await fixture.whenStable();

    expect(showNotice).toHaveBeenCalledWith('admin.userConflict.lastActiveAdmin');
    expect(handleError).not.toHaveBeenCalled();
    expect(searchUsers).toHaveBeenCalled(); // reload snaps the toggle back
  });

  const searchInput = () =>
    fixture.nativeElement.querySelector('[data-test-id="userSearch"]') as HTMLInputElement;

  const type = async (value: string) => {
    const input = searchInput();
    input.value = value;
    input.dispatchEvent(new Event('input'));
    // The term reaches the query only after the debounce settles, so wait past it before asserting.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
  };

  it('searches server-side on a new term and returns to the first page', async () => {
    // Move off the first page, then start a search.
    paginator().page.emit({ pageIndex: 2, pageSize: 10, length: 42, previousPageIndex: 0 });
    await fixture.whenStable();
    searchUsers.mockClear();

    await type('ali');

    expect(searchUsers).toHaveBeenCalledWith(expect.objectContaining({ search: 'ali', page: 0 }));
  });

  const sortHeaders = () =>
    fixture.debugElement.queryAll(By.directive(MatSortHeader)).map((d) => d.nativeElement);

  it('sorts by username server-side when the username header is clicked', async () => {
    searchUsers.mockClear();

    sortHeaders()[0].click(); // Benutzername
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'username,asc', page: 0 }),
    );
  });

  it('maps the Aktiv header to the enabled sort key', async () => {
    searchUsers.mockClear();

    sortHeaders()[2].click(); // Aktiv column, keyed to enabled
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(expect.objectContaining({ sort: 'enabled,asc' }));
  });

  it('reflects a sheet-applied sort on the expanded table headers after a resize', async () => {
    // Pick an ordering in the compact sheet, then widen to the (rebuilt) expanded table.
    isCompact.set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[data-test-id="sortButton"]').click();
    (open.mock.calls[0][1].data as UserSortSheetData).applySort('email,desc');
    isCompact.set(false);
    await fixture.whenStable();

    const matSort = fixture.debugElement.query(By.directive(MatSort)).injector.get(MatSort);
    expect(matSort.active).toBe('email');
    expect(matSort.direction).toBe('desc');
  });

  it('filters to admins when the Admins chip is selected and returns to the first page', async () => {
    searchUsers.mockClear();

    fixture.nativeElement.querySelector('[data-test-id="adminsChip"]').click();
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ adminsOnly: true, page: 0 }),
    );
  });

  it('opens the sort-and-filter sheet from the compact sort button with the current state', async () => {
    isCompact.set(true);
    await fixture.whenStable();

    fixture.nativeElement.querySelector('[data-test-id="sortButton"]').click();

    expect(open).toHaveBeenCalledWith(
      UserSortSheet,
      expect.objectContaining({
        data: expect.objectContaining({ sort: undefined, adminsOnly: false }),
      }),
    );
  });

  it('applies an ordering chosen in the compact sheet and returns to the first page', async () => {
    isCompact.set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[data-test-id="sortButton"]').click();
    const data = open.mock.calls[0][1].data as UserSortSheetData;
    searchUsers.mockClear();

    data.applySort('email,desc');
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'email,desc', page: 0 }),
    );
  });

  it('applies the admins filter toggled in the compact sheet', async () => {
    isCompact.set(true);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[data-test-id="sortButton"]').click();
    const data = open.mock.calls[0][1].data as UserSortSheetData;
    searchUsers.mockClear();

    data.setAdminsOnly(true);
    await fixture.whenStable();

    expect(searchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ adminsOnly: true, page: 0 }),
    );
  });
});
