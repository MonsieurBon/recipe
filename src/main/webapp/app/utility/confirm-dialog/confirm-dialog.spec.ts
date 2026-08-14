import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Mock } from 'vitest';

import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  let close: Mock<(result?: boolean) => void>;

  const data: ConfirmDialogData = {
    titleKey: 'admin.deleteUser.title',
    messageKey: 'admin.deleteUser.message',
    messageParams: { username: 'mytest' },
    confirmKey: 'admin.deleteUser.action',
  };

  const setup = async (overrides: Partial<ConfirmDialogData> = {}) => {
    close = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        provideTranslateTesting(),
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { ...data, ...overrides } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();
  };

  const text = (testId: string): string =>
    fixture.nativeElement.querySelector(`[data-test-id="${testId}"]`)?.textContent?.trim() ?? '';
  const button = (testId: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`[data-test-id="${testId}"]`);

  it('names what is about to be destroyed', async () => {
    await setup();

    expect(text('confirmTitle')).toBe('Benutzer löschen?');
    expect(text('confirmMessage')).toContain('mytest');
  });

  it('labels the confirming action in the caller’s words', async () => {
    await setup();

    expect(text('confirmAction')).toBe('Löschen');
  });

  it('answers yes', async () => {
    await setup();

    button('confirmAction').click();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('answers no', async () => {
    await setup();

    button('cancelAction').click();

    expect(close).toHaveBeenCalledWith();
  });
});
