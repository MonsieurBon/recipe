import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Shared chrome for Material bottom sheets: a full-width handle that dismisses the sheet and the
 * sheet's trailing padding. The sheet's own controls are projected below the handle, so each sheet
 * component stays focused on its content while the dismiss wiring lives in one place.
 */
@Component({
  selector: 'app-bottom-sheet',
  imports: [TranslatePipe],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheet {
  private readonly sheetRef = inject(MatBottomSheetRef);

  protected close(): void {
    this.sheetRef.dismiss();
  }
}
