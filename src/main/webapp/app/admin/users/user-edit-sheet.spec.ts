import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MAT_DIALOG_DEFAULT_OPTIONS, MatDialog } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { of, Subject, throwError } from 'rxjs';
import { Mock } from 'vitest';

import { NotificationService } from '../../utility/notification.service';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { AdminService, AdminUser, UserUpdate } from '../admin.service';
import { UserEditSheet, UserEditSheetData } from './user-edit-sheet';

describe('UserEditSheet', () => {
  let fixture: ComponentFixture<UserEditSheet>;
  let updateUser: Mock<(id: number, changes: UserUpdate) => ReturnType<AdminService['updateUser']>>;
  let deleteUser: Mock<(id: number) => ReturnType<AdminService['deleteUser']>>;
  let showNotice: Mock<(key: string) => void>;
  let dismiss: Mock<() => void>;
  let overlay: OverlayContainer;

  const user: AdminUser = {
    id: 5,
    username: 'mytest',
    email: 'my@test.ch',
    enabled: true,
    roles: ['USER'],
  };

  const setup = async (data: UserEditSheetData) => {
    updateUser = vi.fn((id: number, changes: UserUpdate) =>
      of({
        ...data.user,
        id,
        enabled: changes.enabled,
        roles: changes.role === 'ADMIN' ? ['USER', 'ADMIN'] : ['USER'],
      }),
    );
    deleteUser = vi.fn(() => of(undefined));
    showNotice = vi.fn();
    dismiss = vi.fn();

    // The real MatDialog, so these specs exercise the actual confirmation the user sees rather
    // than a stand-in: a broken dialog or a mis-wired result would pass against a fake.
    await TestBed.configureTestingModule({
      imports: [UserEditSheet],
      providers: [
        // The dialog reports its answer only once it has animated out, so the specs run it without
        // animation; otherwise every assertion would be waiting on a transition.
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: { enterAnimationDuration: 0, exitAnimationDuration: 0 },
        },
        provideTranslateTesting(),
        { provide: AdminService, useValue: { updateUser, deleteUser } },
        { provide: NotificationService, useValue: { showNotice } },
        { provide: MatBottomSheetRef, useValue: { dismiss } },
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
      ],
    }).compileComponents();

    overlay = TestBed.inject(OverlayContainer);
    fixture = TestBed.createComponent(UserEditSheet);
    fixture.detectChanges();
  };

  afterEach(() => TestBed.inject(MatDialog).closeAll());

  const toggle = () => fixture.debugElement.query(By.directive(MatSlideToggle));
  const roleSelect = () => fixture.debugElement.query(By.directive(MatSelect));

  it('reflects the user’s current enabled state', async () => {
    await setup({ user, isOwn: false });

    expect((toggle().componentInstance as MatSlideToggle).checked).toBe(true);
  });

  it('disables the toggle on the signed-in admin’s own account', async () => {
    await setup({ user, isOwn: true });

    expect((toggle().componentInstance as MatSlideToggle).disabled).toBe(true);
  });

  it('gives the toggle an accessible name naming the user', async () => {
    await setup({ user, isOwn: false });

    const button: HTMLElement = fixture.nativeElement.querySelector(
      '[data-test-id="activeToggle"] button[role="switch"]',
    );
    expect(button.getAttribute('aria-label')).toContain('mytest');
  });

  it('persists a change through the service', async () => {
    await setup({ user, isOwn: false });

    toggle().triggerEventHandler('change', { checked: false });

    expect(updateUser).toHaveBeenCalledWith(5, { enabled: false, role: 'USER' });
  });

  it('reflects the user’s current role', async () => {
    await setup({ user: { ...user, roles: ['USER', 'ADMIN'] }, isOwn: false });

    expect((roleSelect().componentInstance as MatSelect).value).toBe('ADMIN');
  });

  it('gives the role select an accessible name naming the user', async () => {
    await setup({ user, isOwn: false });

    // The visible "Rolle" text sits in the row rather than inside the control, so the select
    // carries its own accessible name.
    const select: HTMLElement = fixture.nativeElement.querySelector('[data-test-id="roleSelect"]');
    expect(select.getAttribute('aria-label')).toContain('mytest');
  });

  it('disables the role select on the signed-in admin’s own account', async () => {
    await setup({ user, isOwn: true });

    expect((roleSelect().componentInstance as MatSelect).disabled).toBe(true);
  });

  it('persists a role change through the service, keeping the enabled state', async () => {
    await setup({ user, isOwn: false });

    roleSelect().triggerEventHandler('selectionChange', { value: 'ADMIN' });

    expect(updateUser).toHaveBeenCalledWith(5, { enabled: true, role: 'ADMIN' });
  });

  it('shows the dedicated notice and reverts on a refused demotion', async () => {
    await setup({ user: { ...user, roles: ['USER', 'ADMIN'] }, isOwn: false });
    updateUser.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { reason: 'lastActiveAdmin' } }),
      ),
    );

    roleSelect().triggerEventHandler('selectionChange', { value: 'USER' });
    fixture.detectChanges();

    expect(showNotice).toHaveBeenCalledWith('admin.userConflict.lastActiveAdmin');
    expect((roleSelect().componentInstance as MatSelect).value).toBe('ADMIN');
  });

  it('shows the dedicated notice and reverts on a conflict', async () => {
    await setup({ user, isOwn: false });
    updateUser.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { reason: 'lastActiveAdmin' } }),
      ),
    );

    toggle().triggerEventHandler('change', { checked: false });
    fixture.detectChanges();

    expect(showNotice).toHaveBeenCalledWith('admin.userConflict.lastActiveAdmin');
    expect((toggle().componentInstance as MatSlideToggle).checked).toBe(true);
  });

  const deleteRow = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('[data-test-id="deleteAction"]');
  const errorText = (): string =>
    fixture.nativeElement.querySelector('[data-test-id="editError"]')?.textContent?.trim() ?? '';

  // The confirmation renders in the CDK overlay at document level rather than inside the sheet.
  const inDialog = (testId: string): HTMLElement | null =>
    overlay.getContainerElement().querySelector(`[data-test-id="${testId}"]`);

  const openConfirmation = async () => {
    deleteRow().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const answerConfirmation = async (testId: 'confirmAction' | 'cancelAction') => {
    (inDialog(testId) as HTMLButtonElement).click();
    // The dialog reports its answer once it has torn down, which lands on a later macrotask.
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('disables deleting on the signed-in admin’s own account', async () => {
    await setup({ user, isOwn: true });

    expect(deleteRow().disabled).toBe(true);
  });

  it('asks for confirmation, naming the user and the act', async () => {
    await setup({ user, isOwn: false });

    await openConfirmation();

    expect(inDialog('confirmTitle')?.textContent?.trim()).toBe('Benutzer löschen?');
    expect(inDialog('confirmMessage')?.textContent).toContain('mytest');
    expect(inDialog('confirmAction')?.textContent?.trim()).toBe('Löschen');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deletes nothing when the confirmation is cancelled', async () => {
    await setup({ user, isOwn: false });

    await openConfirmation();
    await answerConfirmation('cancelAction');

    expect(deleteUser).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('deletes the user once confirmed and closes the editor', async () => {
    await setup({ user, isOwn: false });

    await openConfirmation();
    await answerConfirmation('confirmAction');

    expect(deleteUser).toHaveBeenCalledWith(5);
    expect(dismiss).toHaveBeenCalled();
  });

  it('holds the delete action and shows progress while the deletion is in flight', async () => {
    await setup({ user, isOwn: false });
    const inFlight = new Subject<void>();
    deleteUser.mockReturnValue(inFlight.asObservable());

    await openConfirmation();
    await answerConfirmation('confirmAction');

    // A second confirmed deletion would 404 on a user that is already gone, which reaches the user
    // as the generic error rather than as anything they can act on.
    expect(deleteRow().disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();

    inFlight.next();
    inFlight.complete();
    fixture.detectChanges();

    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalled();
  });

  it('hands the delete action back once a refusal has been shown', async () => {
    await setup({ user, isOwn: false });
    deleteUser.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { reason: 'selfDeletion' } })),
    );

    await openConfirmation();
    await answerConfirmation('confirmAction');

    expect(deleteRow().disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
  });

  it('states a refused deletion inline and keeps the editor open', async () => {
    await setup({ user, isOwn: false });
    deleteUser.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { reason: 'selfDeletion' } })),
    );

    await openConfirmation();
    await answerConfirmation('confirmAction');

    expect(errorText()).toBe('Du kannst dein eigenes Konto nicht löschen.');
    expect(dismiss).not.toHaveBeenCalled();
    expect(showNotice).not.toHaveBeenCalled();
  });

  it('clears a previous refusal when the next deletion is confirmed', async () => {
    await setup({ user, isOwn: false });
    deleteUser.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { reason: 'lastActiveAdmin' } }),
      ),
    );

    await openConfirmation();
    await answerConfirmation('confirmAction');
    expect(errorText()).not.toBe('');

    await openConfirmation();
    await answerConfirmation('confirmAction');

    expect(errorText()).toBe('');
    expect(dismiss).toHaveBeenCalled();
  });
});
