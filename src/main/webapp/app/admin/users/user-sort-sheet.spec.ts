import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { Mock } from 'vitest';

import { provideTranslateTesting } from '../../testing/provide-translate-testing';
import { UserSortSheet, UserSortSheetData } from './user-sort-sheet';

describe('UserSortSheet', () => {
  let fixture: ComponentFixture<UserSortSheet>;
  let applySort: Mock<UserSortSheetData['applySort']>;
  let setAdminsOnly: Mock<UserSortSheetData['setAdminsOnly']>;
  let dismiss: Mock<() => void>;

  const setup = async (data: Partial<UserSortSheetData> = {}) => {
    applySort = vi.fn();
    setAdminsOnly = vi.fn();
    dismiss = vi.fn();

    await TestBed.configureTestingModule({
      imports: [UserSortSheet],
      providers: [
        provideTranslateTesting(),
        { provide: MatBottomSheetRef, useValue: { dismiss } },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: { sort: undefined, adminsOnly: false, applySort, setAdminsOnly, ...data },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSortSheet);
    fixture.detectChanges();
  };

  const orderings = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[data-test-id="sortOption"]'));

  it('offers the six orderings', async () => {
    await setup();

    expect(orderings().length).toBe(6);
  });

  it('marks the current ordering as selected', async () => {
    await setup({ sort: 'email,desc' });

    const selected = fixture.nativeElement.querySelectorAll('[data-test-id="sortOption"].sel');
    expect(selected.length).toBe(1);
    expect((selected[0] as HTMLElement).textContent).toContain('E-Mail (Z–A)');
  });

  it('applies the chosen ordering and dismisses', async () => {
    await setup();

    // Order matches the sheet: username asc/desc, email asc/desc, active first, disabled first.
    orderings()[3].click(); // E-Mail (Z–A)

    expect(applySort).toHaveBeenCalledWith('email,desc');
    expect(dismiss).toHaveBeenCalled();
  });

  it('applies the admins filter immediately without dismissing', async () => {
    await setup();

    fixture.debugElement
      .query(By.directive(MatSlideToggle))
      .triggerEventHandler('change', { checked: true });

    expect(setAdminsOnly).toHaveBeenCalledWith(true);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('reflects the current admins-only state on the toggle', async () => {
    await setup({ adminsOnly: true });

    const toggle = fixture.debugElement.query(By.directive(MatSlideToggle))
      .componentInstance as MatSlideToggle;
    expect(toggle.checked).toBe(true);
  });

  it('dismisses when the handle is tapped', async () => {
    await setup();

    fixture.nativeElement.querySelector('[data-test-id="sheetHandle"]').click();

    expect(dismiss).toHaveBeenCalled();
  });
});
