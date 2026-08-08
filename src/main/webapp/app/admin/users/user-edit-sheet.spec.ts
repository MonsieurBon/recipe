import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { of, throwError } from 'rxjs';
import { Mock } from 'vitest';

import { NotificationService } from '../../utility/notification.service';
import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { AdminService, AdminUser, UserUpdate } from '../admin.service';
import { UserEditSheet, UserEditSheetData } from './user-edit-sheet';

describe('UserEditSheet', () => {
  let fixture: ComponentFixture<UserEditSheet>;
  let updateUser: Mock<(id: number, changes: UserUpdate) => ReturnType<AdminService['updateUser']>>;
  let showNotice: Mock<(key: string) => void>;
  let dismiss: Mock<() => void>;

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
    showNotice = vi.fn();
    dismiss = vi.fn();

    await TestBed.configureTestingModule({
      imports: [UserEditSheet],
      providers: [
        provideTranslateTesting(),
        { provide: AdminService, useValue: { updateUser } },
        { provide: NotificationService, useValue: { showNotice } },
        { provide: MatBottomSheetRef, useValue: { dismiss } },
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserEditSheet);
    fixture.detectChanges();
  };

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
});
