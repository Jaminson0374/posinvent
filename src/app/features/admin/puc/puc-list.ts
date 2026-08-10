import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
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
import { PucAccountService } from '../../../core/services/puc-account.service';
import { PucAccount } from '../../../core/models/product-catalog.model';
import Swal from 'sweetalert2';

interface PucTreeNode {
  account: PucAccount;
  children: PucTreeNode[];
  expanded: boolean;
}

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
  readonly formError = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly saving = signal(false);
  readonly formLoading = signal(false);
  readonly isEdit = signal(false);
  readonly editId = signal<string | null>(null);
  readonly parentAccounts = signal<PucAccount[]>([]);

  readonly accountForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    level: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    parentCode: [null as string | null],
    accountClass: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    accountNature: ['DEBITO', [Validators.required]],
    allowsTransactions: [true],
    active: [true],
  });

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

  readonly allAccounts = signal<PucAccount[]>([]);
  readonly searchQuery = signal('');
  /** Bump this to trigger flatRows recomputation when a node is toggled */
  readonly toggleVersion = signal(0);

  /** Build tree root nodes (level 1, or accounts with no parent) */
  readonly rootNodes = computed(() => {
    const accounts = this.allAccounts();
    const query = this.searchQuery().toLowerCase().trim();

    // Filter if there's a search query
    let filtered = accounts;
    if (query) {
      filtered = accounts.filter(
        (a) => a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query),
      );
    }

    // Build children map: parentCode → list of children
    const childrenMap = new Map<string | null, PucAccount[]>();
    for (const a of filtered) {
      const parent = a.parentCode || null;
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(a);
    }

    // Recursively build tree
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

  /** Flatten tree into rows with indentation level for MatTable */
  readonly flatRows = computed(() => {
    // Read toggleVersion so this recomputes when a node is toggled
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

  constructor() {
    this.loadTree();
    this.loadParentAccounts();

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
  }

  openNew(): void {
    this.accountForm.reset({
      code: '',
      name: '',
      level: 1,
      parentCode: null,
      accountClass: 1,
      accountNature: 'DEBITO',
      allowsTransactions: true,
      active: true,
    });
    this.formError.set(null);
    this.isEdit.set(false);
    this.editId.set(null);
    this.panelOpen.set(true);
  }

  openEdit(account: PucAccount): void {
    this.formError.set(null);
    this.isEdit.set(true);
    this.editId.set(account.id);
    this.accountForm.patchValue(account);
    this.panelOpen.set(true);
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
    if (
      this.route.snapshot.paramMap.has('id') ||
      this.route.snapshot.routeConfig?.path === 'puc/nuevo'
    ) {
      this.router.navigate(['/administracion/puc']);
    }
  }

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

  private loadParentAccounts(): void {
    this.service.tree().subscribe({
      next: (accounts) => this.parentAccounts.set(accounts),
    });
  }

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
}
