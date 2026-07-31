import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Mock } from 'vitest';

import { provideTranslateTesting } from '../testing/provide-translate-testing';
import { BottomSheet } from './bottom-sheet';

@Component({
  imports: [BottomSheet],
  template: `<app-bottom-sheet><p class="projected">content</p></app-bottom-sheet>`,
})
class HostComponent {}

describe('BottomSheet', () => {
  let fixture: ComponentFixture<HostComponent>;
  let dismiss: Mock<() => void>;

  beforeEach(async () => {
    dismiss = vi.fn();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideTranslateTesting(), { provide: MatBottomSheetRef, useValue: { dismiss } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('projects the sheet content below the handle', () => {
    expect(fixture.nativeElement.querySelector('.projected')).not.toBeNull();
  });

  it('dismisses the sheet when the handle is tapped', () => {
    fixture.nativeElement.querySelector('[data-test-id="sheetHandle"]').click();

    expect(dismiss).toHaveBeenCalled();
  });
});
