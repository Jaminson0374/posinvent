import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpResourceRef } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, merge } from 'rxjs';
import Swal from 'sweetalert2';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { ShiftService } from '../../../core/services/shift.service';
import { CashRegister } from '../../../core/models/cash-register.model';
import { CashCountLine, CashCountResponse, Shift } from '../../../core/models/shift.model';

interface Denomination {
  value: number;
  label: string;
  type: 'bill' | 'coin';
}

@Component({
  selector: 'app-arqueo',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './arqueo.html',
  styleUrl: './arqueo.css',
})
export class ArqueoComponent implements OnInit {
  private readonly cashRegisterService = inject(CashRegisterService);
  private readonly shiftService = inject(ShiftService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly shiftLoading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly cashRegisters = signal<CashRegister[]>([]);
  readonly selectedRegisterId = new FormControl<string>('', { nonNullable: true });

  readonly activeShift = signal<Shift | null>(null);
  readonly countResult = signal<CashCountResponse | null>(null);
  readonly notesControl = new FormControl<string>('', { nonNullable: true });

  private readonly historyRef = signal<
    HttpResourceRef<CashCountResponse[] | undefined> | null
  >(null);

  readonly denominations: Denomination[] = [
    { value: 100000, label: '$100,000', type: 'bill' },
    { value: 50000, label: '$50,000', type: 'bill' },
    { value: 20000, label: '$20,000', type: 'bill' },
    { value: 10000, label: '$10,000', type: 'bill' },
    { value: 5000, label: '$5,000', type: 'bill' },
    { value: 2000, label: '$2,000', type: 'bill' },
    { value: 1000, label: '$1,000', type: 'bill' },
    { value: 1000, label: '$1,000', type: 'coin' },
    { value: 500, label: '$500', type: 'coin' },
    { value: 200, label: '$200', type: 'coin' },
    { value: 100, label: '$100', type: 'coin' },
    { value: 50, label: '$50', type: 'coin' },
  ];

  readonly countControls: FormControl<number | null>[] = this.denominations.map(
    () => new FormControl<number | null>(null),
  );

  // FormControl values are not signals, so this revision counter is bumped on every value
  // change to keep the derived totals reactive and in sync with the inputs.
  private readonly countRevision = signal(0);

  readonly countedByDenomination = computed(() => {
    this.countRevision();
    return this.countControls.map((ctrl, i) => {
      const qty = ctrl.value ?? 0;
      return { denom: this.denominations[i], qty, subtotal: qty * this.denominations[i].value };
    });
  });

  readonly totalCounted = computed(() =>
    this.countedByDenomination().reduce((sum, d) => sum + d.subtotal, 0),
  );

  // Local fallback: expected cash based on the shift opening amount. The backend computes the
  // real expected total from invoices, so once a count has been saved we prefer its response.
  readonly expectedCash = computed(() => {
    const shift = this.activeShift();
    if (!shift) return 0;
    return shift.openingAmount;
  });

  readonly expectedTotal = computed(() => this.countResult()?.expectedTotal ?? this.expectedCash());

  readonly difference = computed(
    () => this.countResult()?.difference ?? this.totalCounted() - this.expectedTotal(),
  );

  readonly canSave = computed(() => {
    const shift = this.activeShift();
    return !!shift && shift.status === 'OPEN' && !this.saving();
  });

  history(): CashCountResponse[] {
    return this.historyRef()?.value() ?? [];
  }

  ngOnInit(): void {
    this.cashRegisterService
      .listActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registers: CashRegister[]) => {
          this.cashRegisters.set(registers);
          if (registers.length > 0) {
            this.selectedRegisterId.setValue(registers[0].id);
            this.loadShift(registers[0].id);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al cargar las cajas registradoras.');
        },
      });

    this.selectedRegisterId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        if (id) {
          this.loadShift(id);
        }
      });

    merge(...this.countControls.map((ctrl) => ctrl.valueChanges))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.countRevision.update((v) => v + 1));
  }

  private loadShift(cashRegisterId: string): void {
    this.shiftLoading.set(true);
    this.activeShift.set(null);
    this.countResult.set(null);
    this.historyRef.set(null);

    this.shiftService
      .getActive(cashRegisterId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (shift: Shift) => {
          this.activeShift.set(shift);
          this.historyRef.set(this.shiftService.cashCounts(shift.id));
          this.shiftLoading.set(false);
        },
        error: () => {
          this.activeShift.set(null);
          this.historyRef.set(null);
          this.shiftLoading.set(false);
        },
      });
  }

  async saveCount(): Promise<void> {
    const shift = this.activeShift();
    if (!shift || shift.status !== 'OPEN') return;

    this.saving.set(true);
    try {
      const response = await firstValueFrom(
        this.shiftService.saveCashCount(shift.id, {
          lines: this.buildLines(),
          notes: this.notesControl.value || null,
        }),
      );

      this.countResult.set(response);
      this.historyRef()?.reload();

      await Swal.fire({
        icon: 'success',
        title: 'Arqueo guardado',
        text: 'El conteo de efectivo se registró correctamente.',
        confirmButtonColor: '#15803d',
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error?: { message?: string } }).error?.message
          : 'Error al guardar el arqueo. Intentá de nuevo.';
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar arqueo',
        text: message ?? 'Error desconocido.',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private buildLines(): CashCountLine[] {
    return this.countedByDenomination()
      .filter((d) => d.qty > 0)
      .map(
        (d): CashCountLine => ({
          denominationValue: d.denom.value,
          denominationType: d.denom.type === 'bill' ? 'BILL' : 'COIN',
          quantity: d.qty,
        }),
      );
  }

  resetCounts(): void {
    this.countControls.forEach((c) => c.setValue(null));
  }

  fillExample(): void {
    const expected = this.expectedTotal();
    if (expected <= 0) return;

    this.resetCounts();
    let remaining = expected;

    for (let i = 0; i < this.denominations.length && remaining > 0; i++) {
      const denom = this.denominations[i];
      const qty = Math.floor(remaining / denom.value);
      if (qty > 0) {
        this.countControls[i].setValue(qty);
        remaining -= qty * denom.value;
      }
    }
  }
}
