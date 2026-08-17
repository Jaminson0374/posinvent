import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, of, switchMap, catchError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { PucAccountService } from '../../../core/services/puc-account.service';
import { PucAccount } from '../../../core/models/product-catalog.model';
import Swal from 'sweetalert2';

interface PucTreeNode {
  account: PucAccount;
  children: PucTreeNode[];
  expanded: boolean;
}

const CODE_PATTERN = /^[a-zA-Z0-9]+$/;

const NATURE_BY_CLASS: Record<number, string> = {
  1: 'DEBITO',
  2: 'CREDITO',
  3: 'CREDITO',
  4: 'CREDITO',
  5: 'DEBITO',
  6: 'DEBITO',
  7: 'DEBITO',
  8: 'DEBITO',
  9: 'CREDITO',
};

const LEVEL_TYPE_LABELS: Record<number, string> = {
  1: 'Clase',
  2: 'Grupo',
  3: 'Cuenta',
  4: 'Subcuenta',
  5: 'Auxiliar interno POS_VTA',
};

@Component({
  selector: 'app-puc-list',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatExpansionModule,
  ],
  templateUrl: './puc-list.html',
  styleUrl: './puc-list.css',
})
export class PucListComponent {
  readonly service = inject(PucAccountService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);

  // ── Tree state ──────────────────────────────────────────────────────────

  readonly displayedColumns = [
    'expand',
    'code',
    'name',
    'level',
    'accountClass',
    'accountNature',
    'active',
    'actions',
  ];

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly allAccounts = signal<PucAccount[]>([]);
  readonly searchQuery = signal('');
  readonly toggleVersion = signal(0);
  readonly selectedAccount = signal<PucAccount | null>(null);

  readonly rootNodes = computed(() => {
    const accounts = this.allAccounts();
    const query = this.searchQuery().toLowerCase().trim();
    let filtered = accounts;
    if (query) {
      const byCode = new Map(accounts.map((a) => [a.code, a]));
      const include = new Set<string>();
      for (const a of accounts) {
        if (a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)) {
          let current: PucAccount | undefined = a;
          while (current && !include.has(current.code)) {
            include.add(current.code);
            current = current.parentCode ? byCode.get(current.parentCode) : undefined;
          }
        }
      }
      filtered = accounts.filter((a) => include.has(a.code));
    }
    const childrenMap = new Map<string | null, PucAccount[]>();
    for (const a of filtered) {
      const parent = a.parentCode || null;
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(a);
    }
    const buildTree = (parentCode: string | null): PucTreeNode[] => {
      const children = childrenMap.get(parentCode) || [];
      return children
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((account) => ({
          account,
          children: buildTree(account.code),
          expanded: true,
        }));
    };
    return buildTree(null);
  });

  readonly flatRows = computed(() => {
    this.toggleVersion();
    const result: { node: PucTreeNode; depth: number }[] = [];
    const flatten = (nodes: PucTreeNode[], depth: number) => {
      for (const node of nodes) {
        result.push({ node, depth });
        if (node.expanded && node.children.length > 0) {
          flatten(node.children, depth + 1);
        }
      }
    };
    flatten(this.rootNodes(), 0);
    return result;
  });

  readonly accountClassLabels: Record<number, string> = {
    1: 'Activo',
    2: 'Pasivo',
    3: 'Patrimonio',
    4: 'Ingresos',
    5: 'Gastos',
    6: 'Costos de venta',
    7: 'Costos de producción',
    8: 'Cuentas de orden deudoras',
    9: 'Cuentas de orden acreedoras',
  };

  readonly accountClassOptions: ReadonlyArray<{ value: number; label: string }> = [
    { value: 1, label: '1 — Activo' },
    { value: 2, label: '2 — Pasivo' },
    { value: 3, label: '3 — Patrimonio' },
    { value: 4, label: '4 — Ingresos' },
    { value: 5, label: '5 — Gastos' },
    { value: 6, label: '6 — Costos de venta' },
    { value: 7, label: '7 — Costos de producción' },
    { value: 8, label: '8 — Cuentas de orden deudoras' },
    { value: 9, label: '9 — Cuentas de orden acreedoras' },
  ];

  readonly accountNatureOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'DEBITO', label: 'Débito' },
    { value: 'CREDITO', label: 'Crédito' },
  ];

  // ── Form state ──────────────────────────────────────────────────────────

  readonly panelOpen = signal(false);
  readonly saving = signal(false);
  readonly formLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);

  readonly accountForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(CODE_PATTERN)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    level: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    parentCode: [null as string | null],
    accountClass: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    accountNature: ['DEBITO', [Validators.required]],
    allowsTransactions: [{ value: true, disabled: false }],
    active: [true],
  });

  // ── Computed form values ────────────────────────────────────────────────

  readonly levelTypeLabel = computed(() => {
    const lvl = this.accountForm.controls.level.value;
    return LEVEL_TYPE_LABELS[lvl] ?? `Nivel ${lvl}`;
  });

  /** Nivel is readonly when derivable from parent (level = parentLevel + 1). */
  readonly levelEditable = signal(true);

  /** Parent accounts filtered to only those of level = selectedLevel - 1. */
  readonly validParentAccounts = computed(() => {
    const level = this.accountForm.controls.level.value;
    return this.allAccounts().filter((a) => a.level === level - 1);
  });

  /** Suggested nature based on selected account class. */
  readonly suggestedNature = computed(() => {
    const cls = this.accountForm.controls.accountClass.value;
    return NATURE_BY_CLASS[cls] ?? 'DEBITO';
  });

  /** Whether allowsTransactions should be locked. */
  readonly transactionsLocked = computed(() => {
    return (this.accountForm.controls.level.value ?? 1) < 4;
  });

  /** Ancestor path for the selected parent. */
  readonly ancestorPath = computed(() => {
    const parentCode = this.accountForm.controls.parentCode.value;
    if (!parentCode) return null;
    const path: { code: string; name: string }[] = [];
    let current: string | null = parentCode;
    const visited = new Set<string>();
    while (current && !visited.has(current) && path.length < 10) {
      visited.add(current);
      const account = this.findAccountByCode(current);
      if (account) {
        path.unshift({ code: account.code, name: account.name });
        current = account.parentCode;
      } else {
        break;
      }
    }
    return path;
  });

  /** Informative block computed values. */
  readonly infoBlock = computed(() => {
    const level = this.accountForm.controls.level.value ?? 1;
    const parentCode = this.accountForm.controls.parentCode.value;
    const allowsTx = this.accountForm.controls.allowsTransactions.value ?? false;
    const active = this.accountForm.controls.active.value ?? true;
    const cls = this.accountForm.controls.accountClass.value ?? 1;
    const nature = this.accountForm.controls.accountNature.value ?? 'DEBITO';

    let parentDisplay = '—';
    if (parentCode && level > 1) {
      const p = this.findAccountByCode(parentCode);
      parentDisplay = p ? `${p.code} — ${p.name}` : parentCode;
    } else if (level === 1) {
      parentDisplay = 'Cuenta raíz';
    }

    return {
      level: `${level} — ${this.levelTypeLabel()}`,
      parent: parentDisplay,
      classDisplay: `${cls} — ${this.accountClassLabels[cls] ?? cls}`,
      nature,
      type: allowsTx ? 'Cuenta de movimiento' : 'Cuenta agrupadora',
      active: active ? 'Activa' : 'Inactiva',
    };
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────

  constructor() {
    this.loadTree();

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.openEditById(routeId);
    } else if (this.route.snapshot.routeConfig?.path === 'puc/nuevo') {
      this.openNew();
    }

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchQuery.set(value.trim());
      });

    // Class change → suggest nature
    this.accountForm.controls.accountClass.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cls) => {
        const suggested = NATURE_BY_CLASS[cls];
        if (suggested) {
          this.accountForm.controls.accountNature.setValue(suggested, { emitEvent: false });
        }
      });

    // Level change → update parent options and transactions lock
    this.accountForm.controls.level.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lvl) => {
        // Clear parent if level 1
        if (lvl === 1) {
          this.accountForm.controls.parentCode.reset(null, { emitEvent: false });
          this.levelEditable.set(true);
        }
        // Lock allowsTransactions for level < 4
        if (lvl < 4) {
          this.accountForm.controls.allowsTransactions.setValue(false, { emitEvent: false });
          this.accountForm.controls.allowsTransactions.disable({ emitEvent: false });
        } else {
          this.accountForm.controls.allowsTransactions.enable({ emitEvent: false });
        }
      });

    // Code async validator
    this.accountForm.controls.code.setAsyncValidators(this.codeUniqueValidator());
  }

  // ── Code uniqueness async validator ─────────────────────────────────────

  private codeUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const code = (control.value ?? '').trim();
      if (!code) return of(null);
      // Skip validation in edit mode when code hasn't changed
      if (this.isEdit() && this.editId()) return of(null);

      return of(code).pipe(
        debounceTime(400),
        switchMap((c) =>
          this.http.get<{ code: string; available: boolean }>(
            `/api/v1/puc-accounts/check-code?code=${encodeURIComponent(c)}`,
          ),
        ),
        map((res) => (res.available ? null : { codeTaken: true })),
        catchError(() => of(null)), // If check fails, let backend catch on submit
      );
    };
  }

  // ── Tree helpers ────────────────────────────────────────────────────────

  private findAccountByCode(code: string): PucAccount | undefined {
    return this.allAccounts().find((a) => a.code === code);
  }

  toggleExpand(node: PucTreeNode): void {
    node.expanded = !node.expanded;
    this.toggleVersion.update((v) => v + 1);
  }

  collapseAll(): void {
    const collapse = (nodes: PucTreeNode[]) => {
      for (const node of nodes) {
        node.expanded = false;
        collapse(node.children);
      }
    };
    collapse(this.rootNodes());
    this.toggleVersion.update((v) => v + 1);
  }

  hasChildren(node: PucTreeNode): boolean {
    return node.children.length > 0;
  }

  // ── Panel open / close ──────────────────────────────────────────────────

  /**
   * Open form for new account. If an account is selected in the tree,
   * pre-fill it as parent (Nueva cuenta hija).
   */
  openNew(parentAccount?: PucAccount): void {
    const selected = parentAccount ?? this.selectedAccount();

    if (selected) {
      const childLevel = Math.min(selected.level + 1, 5);
      this.accountForm.reset({
        code: '',
        name: '',
        level: childLevel,
        parentCode: selected.code,
        accountClass: selected.accountClass,
        accountNature: NATURE_BY_CLASS[selected.accountClass] ?? 'DEBITO',
        allowsTransactions: childLevel >= 4,
        active: true,
      });
      this.levelEditable.set(false);
    } else {
      this.accountForm.reset({
        code: '',
        name: '',
        level: 1,
        parentCode: null,
        accountClass: 1,
        accountNature: 'DEBITO',
        allowsTransactions: false,
        active: true,
      });
      this.levelEditable.set(true);
    }

    this.formError.set(null);
    this.isEdit.set(false);
    this.editId.set(null);
    this.panelOpen.set(true);

    // Re-apply level-based locks
    this.applyLevelLocks();
  }

  openEdit(account: PucAccount): void {
    this.formError.set(null);
    this.isEdit.set(true);
    this.editId.set(account.id);
    this.accountForm.patchValue(account);
    this.levelEditable.set(!account.parentCode); // readonly if has parent
    this.panelOpen.set(true);
    this.applyLevelLocks();
  }

  private openEditById(id: string): void {
    this.formLoading.set(true);
    this.service.getById(id).subscribe({
      next: (account) => {
        this.formLoading.set(false);
        this.openEdit(account);
      },
      error: () => {
        this.formLoading.set(false);
        this.formError.set('Error al cargar la cuenta PUC.');
        this.panelOpen.set(true);
      },
    });
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedAccount.set(null);
    if (
      this.route.snapshot.paramMap.has('id') ||
      this.route.snapshot.routeConfig?.path === 'puc/nuevo'
    ) {
      this.router.navigate(['/administracion/puc']);
    }
  }

  selectAccount(account: PucAccount): void {
    this.selectedAccount.set(account);
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  submitAccount(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    const value = this.accountForm.getRawValue();
    const body = {
      code: value.code,
      name: value.name,
      level: value.level,
      parentCode: value.parentCode || null,
      accountClass: value.accountClass,
      accountNature: value.accountNature,
      allowsTransactions: value.allowsTransactions,
      active: value.active,
    };

    this.saving.set(true);
    this.formError.set(null);
    const request = this.isEdit()
      ? this.service.update(this.editId()!, body)
      : this.service.create(body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        Swal.fire({
          icon: 'success',
          title: this.isEdit() ? 'Cuenta actualizada' : 'Cuenta creada',
          confirmButtonColor: '#2563eb',
        }).then(() => {
          this.closePanel();
          this.loadTree();
        });
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? 'No fue posible guardar la cuenta.';
        this.formError.set(message);
        Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#ef4444' });
      },
    });
  }

  // ── Tree data ───────────────────────────────────────────────────────────

  loadTree(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.tree().subscribe({
      next: (accounts) => {
        this.allAccounts.set(accounts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el catálogo PUC.');
        this.loading.set(false);
      },
    });
  }

  // ── Deactivation ────────────────────────────────────────────────────────

  deactivateAccount(account: PucAccount): void {
    Swal.fire({
      title: '¿Desactivar cuenta?',
      html: `La cuenta <strong>${account.code} — ${account.name}</strong> será marcada como inactiva.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deactivate(account.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Cuenta desactivada',
              confirmButtonColor: '#15803d',
            });
            this.loadTree();
          },
          error: (err) => {
            const msg = err?.error?.message ?? 'Error al desactivar la cuenta.';
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: msg,
              confirmButtonColor: '#ef4444',
            });
          },
        });
      }
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private applyLevelLocks(): void {
    const lvl = this.accountForm.controls.level.value ?? 1;
    if (lvl < 4) {
      this.accountForm.controls.allowsTransactions.disable({ emitEvent: false });
    } else {
      this.accountForm.controls.allowsTransactions.enable({ emitEvent: false });
    }
  }
}
