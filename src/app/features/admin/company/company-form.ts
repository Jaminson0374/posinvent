import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { CompanyConfigService } from '../../../core/services/company-config.service';
import { DianService } from '../../../core/services/dian.service';
import { PurchaseRetentionConfigService } from '../../../core/services/purchase-retention-config.service';
import type { PurchaseRetentionConfig } from '../../../core/models/purchase-retention-config.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { calculateNitDv } from '../third-parties/utils/nit-dv.utils';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-company-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    DecimalPipe,
  ],
  templateUrl: './company-form.html',
  styleUrl: './company-form.css',
})
export class CompanyFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly companyConfigService = inject(CompanyConfigService);
  private readonly dianService = inject(DianService);
  private readonly catalogService = inject(CatalogService);
  readonly retentionService = inject(PurchaseRetentionConfigService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dianResolutions = this.dianService.resolutions;
  readonly certificates = this.dianService.certificates;
  readonly retentions = signal<PurchaseRetentionConfig[]>([]);
  readonly retentionLoading = signal(false);
  readonly editingRetentionId = signal<string | null>(null);

  readonly retentionForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    rate: [0 as number, [Validators.required, Validators.min(0), Validators.max(100)]],
    baseMin: [0 as number, [Validators.required, Validators.min(0)]],
    appliesToTaxRegime: [''],
    appliesToPersonType: [''],
    sortOrder: [0 as number],
  });

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(255)]],
    nit: ['', [Validators.required, Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(30)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    economicActivity: ['', [Validators.maxLength(255)]],
    personType: ['JURIDICA', [Validators.required]],
    commonName: ['', [Validators.maxLength(200)]],
    manejaAiu: [false],
    taxResponsibilityCodes: [[] as string[]],
    fiscalResponsibilityCodes: [[] as string[]],
    taxCodes: [[] as string[]],
    icaRate: [0 as number, []],
    currency: ['COP', [Validators.required, Validators.maxLength(3)]],
    mainWarehouseId: ['' as string, []], // Oculto en UI; se conserva para round-trip.
    logoUrl: ['', [Validators.maxLength(500)]],
    // Los siguientes 6 campos existen en company_config y se persisten (round-trip),
    // pero NO se exponen en la UI por decisión del usuario. Se conservan en el
    // FormGroup para evitar que un submit los envíe como null y borre su valor en BD.
    moratoryInterestRate: [2.5 as number, []],
    interestGraceDays: [0 as number, []],
    interestCompoundFrequency: ['MONTHLY' as string, []],
    costingMethod: ['WEIGHTED_AVERAGE' as string, []],
    overheadAllocationBase: ['MOD' as string, []],
    overheadRate: [0 as number, []],
    dianResolutionId: ['' as string, []],
    softwarePin: ['' as string, []],
    certificateId: ['' as string, []],
    legalRepresentativeIdentificationTypeId: ['' as string, []],
    legalRepresentativeDocumentNumber: ['', [Validators.maxLength(40)]],
    legalRepresentativeName: ['', [Validators.maxLength(200)]],
    legalRepresentativePosition: ['', [Validators.maxLength(100)]],
    legalRepresentativeAddress: ['', [Validators.maxLength(255)]],
    legalRepresentativeEmail: ['', [Validators.email, Validators.maxLength(255)]],
    purchaseRetefuenteRate: [0 as number, []],
  });

  // Divisas más comunes (ISO 4217).
  readonly currencies = [
    { code: 'COP', label: 'COP — Peso Colombiano' },
    { code: 'USD', label: 'USD — Dólar estadounidense' },
    { code: 'EUR', label: 'EUR — Euro' },
    { code: 'MXN', label: 'MXN — Peso Mexicano' },
    { code: 'ARS', label: 'ARS — Peso Argentino' },
    { code: 'CLP', label: 'CLP — Peso Chileno' },
    { code: 'PEN', label: 'PEN — Sol Peruano' },
    { code: 'BRL', label: 'BRL — Real Brasileño' },
    { code: 'GBP', label: 'GBP — Libra esterlina' },
    { code: 'CAD', label: 'CAD — Dólar canadiense' },
    { code: 'CHF', label: 'CHF — Franco suizo' },
    { code: 'JPY', label: 'JPY — Yen japonés' },
  ];

  // Tarifas ICA (por mil) más comunes.
  readonly icaRates = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Búsqueda de actividad económica (CIIU) con autocomplete (lista desde backend).
  readonly ciiuFilter = signal('');
  readonly filteredCiiu = computed(() => {
    const q = this.ciiuFilter().toLowerCase().trim();
    const list = this.catalogService.ciiuActivities.value() ?? [];
    if (!q) return list;
    return list.filter((a) => a.code.includes(q) || a.name.toLowerCase().includes(q));
  });

  readonly taxResponsibilities = computed(
    () => this.catalogService.taxResponsibilities.value() ?? [],
  );
  readonly fiscalResponsibilities = computed(
    () => this.catalogService.fiscalResponsibilities.value() ?? [],
  );
  readonly taxes = computed(() => this.catalogService.taxes.value() ?? []);

  readonly identificationTypes = computed(
    () => this.catalogService.identificationTypes.value() ?? [],
  );

  isTaxRespDisabled(code: string): boolean {
    const selected = this.form.controls.taxResponsibilityCodes.value ?? [];
    if (selected.includes(code)) return false;
    const item = this.taxResponsibilities().find((c) => c.code === code);
    return !!item && selected.some((s) => item.excludes.includes(s));
  }

  isFiscalRespDisabled(code: string): boolean {
    const selected = this.form.controls.fiscalResponsibilityCodes.value ?? [];
    if (selected.includes(code)) return false;
    const item = this.fiscalResponsibilities().find((c) => c.code === code);
    return !!item && selected.some((s) => item.excludes.includes(s));
  }

  toggleFiscalResp(code: string, checked: boolean): void {
    const ctrl = this.form.controls.fiscalResponsibilityCodes;
    const current = ctrl.value ?? [];
    const next = checked ? [...current, code] : current.filter((c) => c !== code);
    ctrl.setValue(next);
    ctrl.markAsDirty();
  }

  // Señal reactiva del NIT (necesaria para que el DV se recalcule al escribir).
  private readonly nitSig = toSignal(this.form.controls.nit.valueChanges, {
    initialValue: this.form.controls.nit.value,
  });

  // DV (dígito de verificación) — ayuda visual calculada con la util existente.
  // No modifica el modelo de persistencia: el NIT se sigue guardando como un único string.
  readonly dv = computed(() => calculateNitDv(this.nitSig() ?? ''));

  // Instantánea de los últimos valores cargados (para el botón "Cancelar").
  private snapshot: ReturnType<typeof this.form.getRawValue> | null = null;

  constructor() {
    afterNextRender(() => {
      this.loadConfig();
      this.loadRetentions();
    });
  }

  // ── Retention configs ──────────────────────────────────────────────

  loadRetentions(): void {
    this.retentionLoading.set(true);
    this.retentionService.listAll().subscribe({
      next: (list) => {
        this.retentions.set(list);
        this.retentionLoading.set(false);
      },
      error: () => {
        this.retentionLoading.set(false);
        this.error.set('Error al cargar configuraciones de retención.');
      },
    });
  }

  startCreate(): void {
    this.editingRetentionId.set(null);
    this.retentionForm.reset({ rate: 0, baseMin: 0, sortOrder: 0 });
  }

  startEdit(config: PurchaseRetentionConfig): void {
    this.editingRetentionId.set(config.id);
    this.retentionForm.patchValue({
      code: config.code,
      name: config.name,
      description: config.description ?? '',
      rate: config.rate,
      baseMin: config.baseMin,
      appliesToTaxRegime: config.appliesToTaxRegime ?? '',
      appliesToPersonType: config.appliesToPersonType ?? '',
      sortOrder: config.sortOrder,
    });
  }

  cancelRetentionEdit(): void {
    this.editingRetentionId.set(null);
    this.retentionForm.reset({ rate: 0, baseMin: 0, sortOrder: 0 });
  }

  saveRetention(): void {
    if (this.retentionForm.invalid) {
      this.retentionForm.markAllAsTouched();
      return;
    }
    const v = this.retentionForm.getRawValue();
    const body = {
      code: v.code,
      name: v.name,
      description: v.description || null,
      rate: v.rate,
      baseMin: v.baseMin,
      appliesToTaxRegime: v.appliesToTaxRegime || null,
      appliesToPersonType: v.appliesToPersonType || null,
      sortOrder: v.sortOrder,
    };
    const id = this.editingRetentionId();
    (id ? this.retentionService.update(id, body) : this.retentionService.create(body)).subscribe({
      next: () => {
        this.cancelRetentionEdit();
        this.loadRetentions();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al guardar la configuración de retención.');
      },
    });
  }

  toggleRetention(config: PurchaseRetentionConfig): void {
    this.retentionService.toggleActive(config.id).subscribe({
      next: () => this.loadRetentions(),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cambiar el estado.');
      },
    });
  }

  deleteRetention(config: PurchaseRetentionConfig): void {
    Swal.fire({
      title: '¿Eliminar esta retención?',
      text: `Se eliminará "${config.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.retentionService.delete(config.id).subscribe({
        next: () => this.loadRetentions(),
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Error al eliminar.');
        },
      });
    });
  }

  // ── Company config ──────────────────────────────────────────────────

  private loadConfig(): void {
    this.loading.set(true);
    this.companyConfigService.getConfig().subscribe({
      next: (config) => {
        this.form.patchValue({
          companyName: config.companyName,
          nit: this.extractNitBase(config.nit),
          address: config.address ?? '',
          phone: config.phone ?? '',
          email: config.email ?? '',
          economicActivity: config.economicActivity ?? '',
          personType: config.personType ?? 'JURIDICA',
          commonName: config.commonName ?? '',
          manejaAiu: config.manejaAiu ?? false,
          taxResponsibilityCodes: config.taxResponsibilityCodes ?? [],
          fiscalResponsibilityCodes: config.fiscalResponsibilityCodes ?? [],
          taxCodes: config.taxCodes ?? [],
          icaRate: config.icaRate ?? 0,
          currency: config.currency,
          mainWarehouseId: config.mainWarehouseId ?? '',
          logoUrl: config.logoUrl ?? '',
          moratoryInterestRate: config.moratoryInterestRate ?? 2.5,
          interestGraceDays: config.interestGraceDays ?? 0,
          interestCompoundFrequency: config.interestCompoundFrequency ?? 'MONTHLY',
          costingMethod: config.costingMethod ?? 'WEIGHTED_AVERAGE',
          overheadAllocationBase: config.overheadAllocationBase ?? 'MOD',
          overheadRate: config.overheadRate ?? 0,
          dianResolutionId: config.dianResolutionId ?? '',
          softwarePin: config.softwarePin ?? '',
          certificateId: config.certificateId ?? '',
          legalRepresentativeIdentificationTypeId:
            config.legalRepresentativeIdentificationTypeId ?? '',
          legalRepresentativeDocumentNumber: config.legalRepresentativeDocumentNumber ?? '',
          legalRepresentativeName: config.legalRepresentativeName ?? '',
          legalRepresentativePosition: config.legalRepresentativePosition ?? '',
          legalRepresentativeAddress: config.legalRepresentativeAddress ?? '',
          legalRepresentativeEmail: config.legalRepresentativeEmail ?? '',
          purchaseRetefuenteRate: config.purchaseRetefuenteRate ?? 0,
        });
        this.snapshot = this.form.getRawValue();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Error al cargar la configuración de empresa.';
        this.error.set(msg);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const body = {
      companyName: v.companyName,
      nit: this.buildFullNit(v.nit),
      address: v.address || null,
      phone: v.phone || null,
      email: v.email || null,
      economicActivity: v.economicActivity || null,
      personType: v.personType || null,
      commonName: v.commonName || null,
      manejaAiu: v.manejaAiu,
      taxResponsibilityCodes: v.taxResponsibilityCodes ?? [],
      fiscalResponsibilityCodes: v.fiscalResponsibilityCodes ?? [],
      taxCodes: v.taxCodes ?? [],
      icaRate: v.icaRate ? v.icaRate : null,
      currency: v.currency,
      mainWarehouseId: v.mainWarehouseId || null,
      logoUrl: v.logoUrl || null,
      moratoryInterestRate: v.moratoryInterestRate || null,
      interestGraceDays: v.interestGraceDays || null,
      interestCompoundFrequency: v.interestCompoundFrequency || null,
      costingMethod: v.costingMethod || null,
      overheadAllocationBase: v.overheadAllocationBase || null,
      overheadRate: v.overheadRate || null,
      dianResolutionId: v.dianResolutionId || null,
      softwarePin: v.softwarePin || null,
      certificateId: v.certificateId || null,
      legalRepresentativeIdentificationTypeId: v.legalRepresentativeIdentificationTypeId || null,
      legalRepresentativeDocumentNumber: v.legalRepresentativeDocumentNumber || null,
      legalRepresentativeName: v.legalRepresentativeName || null,
      legalRepresentativePosition: v.legalRepresentativePosition || null,
      legalRepresentativeAddress: v.legalRepresentativeAddress || null,
      legalRepresentativeEmail: v.legalRepresentativeEmail || null,
      purchaseRetefuenteRate: v.purchaseRetefuenteRate || null,
    };

    this.saving.set(true);
    this.error.set(null);

    this.companyConfigService.saveConfig(body).subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text: 'La configuración de la empresa ha sido actualizada.',
          confirmButtonColor: '#15803d',
        });
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Error al guardar la configuración.';
        this.error.set(msg);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: msg,
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  // Restaura el formulario a los últimos valores cargados (descarta cambios sin guardar).
  cancel(): void {
    if (this.snapshot) {
      this.form.reset(this.snapshot);
    }
    this.error.set(null);
  }

  onCiiuSelected(event: MatAutocompleteSelectedEvent): void {
    this.ciiuFilter.set(event.option.value as string);
  }

  // El NIT se guarda en BD como "base-DV". El formulario expone solo la base y el
  // DV se calcula automáticamente (mismo comportamiento que en terceros).
  private extractNitBase(full: string): string {
    const m = full?.match(/^(.*)-(\d)$/);
    const base = (m ? m[1] : (full ?? '')).replace(/\D/g, '');
    // El seed por defecto es "000000000-0": tratarlo como vacío (no es un NIT real).
    return /^0+$/.test(base) ? '' : base;
  }

  private buildFullNit(base: string): string {
    const digits = base.replace(/\D/g, '');
    if (!digits) return base;
    const dv = calculateNitDv(digits);
    return dv ? `${digits}-${dv}` : digits;
  }
}
