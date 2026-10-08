import { Component, computed, inject, signal, effect } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';

interface NavChild {
  label: string;
  icon: string;
  route: string;
  disabled?: boolean;
  children?: NavChild[];
}

interface NavModule {
  key: string;
  label: string;
  icon: string;
  route: string;
  roles: string[];
  children: NavChild[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.currentUser;
  readonly userRole = this.auth.userRole;

  private readonly allModules: NavModule[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      roles: ['ADMIN', 'CAJERO', 'CARNICERO', 'AUXILIAR', 'CONTADOR'],
      children: [],
    },
    {
      key: 'pos',
      label: 'POS',
      icon: 'point_of_sale',
      route: '/pos',
      roles: ['ADMIN', 'CAJERO'],
      children: [
        { label: 'Nueva venta', icon: 'shopping_cart', route: '/pos/venta' },
        {
          label: 'Cotizaciones',
          icon: 'request_quote',
          route: '/pos/cotizaciones',
        },
        {
          label: 'Devoluciones',
          icon: 'assignment_return',
          route: '/pos/devoluciones',
        },
        { label: 'Apertura / Cierre caja', icon: 'lock_open', route: '/pos/caja' },
        { label: 'Arqueo de caja', icon: 'calculate', route: '/pos/arqueo' },
        { label: 'Turnos', icon: 'schedule', route: '/pos/turnos' },
      ],
    },
    {
      key: 'logistica',
      label: 'Logística',
      icon: 'local_shipping',
      route: '/logistica',
      roles: ['ADMIN', 'AUXILIAR', 'ALMACENISTA'],
      children: [
        { label: 'Recepciones', icon: 'download', route: '/logistica/recepciones' },
        { label: 'Picking', icon: 'list_alt', route: '/logistica/picking' },
        { label: 'Despachos', icon: 'local_shipping', route: '/logistica/despachos' },
        { label: 'Guías', icon: 'description', route: '/logistica/guias' },
      ],
    },
    {
      key: 'inventario',
      label: 'Inventarios',
      icon: 'inventory_2',
      route: '/inventario',
      roles: ['ADMIN', 'CARNICERO', 'AUXILIAR', 'ALMACENISTA'],
      children: [
        { label: 'Artículos', icon: 'inventory', route: '/inventario/articulos' },
        { label: 'Bodegas', icon: 'warehouse', route: '/inventario/bodegas' },
        { label: 'Lotes de entrada', icon: 'input', route: '/inventario/lotes' },
        { label: 'Stock', icon: 'layers', route: '/inventario/stock' },
        { label: 'Entradas/Salidas', icon: 'import_export', route: '/inventario/stock-manual' },
        { label: 'Desposte', icon: 'content_cut', route: '/inventario/desposte' },
        { label: 'Listas de precios', icon: 'price_change', route: '/inventario/precios' },
        { label: 'Registro animal', icon: 'pets', route: '/inventario/animales' },
        { label: 'Kardex', icon: 'history', route: '/inventario/kardex' },
        {
          label: 'Ajustes de inventario',
          icon: 'tune',
          route: '/inventario/ajustes',
        },
        { label: 'Traslados', icon: 'swap_horiz', route: '/inventario/traslados' },
        {
          label: 'Decomisos',
          icon: 'delete_forever',
          route: '/inventario/decomisos',
        },
        { label: 'Producción', icon: 'factory', route: '/produccion/ordenes' },
      ],
    },
    {
      key: 'contabilidad',
      label: 'Contabilidad',
      icon: 'account_balance',
      route: '/contabilidad',
      roles: ['ADMIN', 'CONTADOR'],
      children: [],
    },
    {
      key: 'compras',
      label: 'Compras',
      icon: 'shopping_bag',
      route: '/compras',
      roles: ['ADMIN', 'AUXILIAR', 'CONTADOR'],
      children: [
        {
          label: 'Órdenes de compra',
          icon: 'receipt_long',
          route: '/compras/ordenes',
          disabled: false,
        },
        {
          label: 'Recepciones',
          icon: 'move_to_inbox',
          route: '/compras/recepcion',
          disabled: false,
        },
        {
          label: 'Devoluciones',
          icon: 'keyboard_return',
          route: '/compras/devoluciones',
          disabled: false,
        },
        {
          label: 'Reportes de compras',
          icon: 'bar_chart',
          route: '/compras/reportes',
          disabled: false,
        },
        {
          label: 'Facturas proveedores',
          icon: 'description',
          route: '/compras/facturas',
          disabled: false,
        },
        {
          label: 'CxP proveedores',
          icon: 'account_balance',
          route: '/compras/cxp',
          disabled: false,
        },
        {
          label: 'Historial compras',
          icon: 'manage_search',
          route: '/compras/historial',
          disabled: false,
        },
        {
          label: 'Proveedores',
          icon: 'business',
          route: '/compras/proveedores',
          disabled: false,
        },
        {
          label: 'Pagos a proveedores',
          icon: 'payments',
          route: '/compras/pagos',
          disabled: false,
        },
        { label: 'Retenciones', icon: 'gavel', route: '/compras/retenciones', disabled: false },
        { label: 'Anticipos', icon: 'payments', route: '/compras/anticipos' },
        {
          label: 'Notas débito/crédito',
          icon: 'receipt_long',
          route: '/compras/notas',
        },
      ],
    },
    {
      key: 'ventas',
      label: 'Ventas',
      icon: 'store',
      route: '/ventas',
      roles: ['ADMIN', 'CAJERO', 'CONTADOR'],
      children: [
        { label: 'Documentos', icon: 'description', route: '/ventas/documentos' },
        { label: 'Clientes', icon: 'people_alt', route: '/ventas/clientes' },
        { label: 'CxC', icon: 'account_balance_wallet', route: '/ventas/cxc' },
        { label: 'Recibos de caja', icon: 'receipt', route: '/ventas/recibos' },
        { label: 'Estados de cuenta', icon: 'summarize', route: '/ventas/estados' },
        { label: 'Cobranzas', icon: 'phone_in_talk', route: '/ventas/cobranzas' },
      ],
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: 'bar_chart',
      route: '/reportes',
      roles: ['ADMIN', 'CONTADOR'],
      children: [
        {
          label: 'Ventas por producto',
          icon: 'trending_up',
          route: '/reportes/ventas',
          disabled: false,
        },
        {
          label: 'Rentabilidad',
          icon: 'analytics',
          route: '/reportes/rentabilidad',
          disabled: false,
        },
        {
          label: 'Historial clientes',
          icon: 'people',
          route: '/reportes/clientes',
          disabled: false,
        },
        {
          label: 'Estados financieros',
          icon: 'assessment',
          route: '/reportes/financieros',
          disabled: false,
        },
      ],
    },
    {
      key: 'administracion',
      label: 'Administración',
      icon: 'manage_accounts',
      route: '/administracion',
      roles: ['ADMIN'],
      children: [
        {
          label: 'Usuarios y roles',
          icon: 'admin_panel_settings',
          route: '/administracion/usuarios',
        },
        {
          label: 'Catálogo PUC',
          icon: 'price_change',
          route: '/administracion/puc',
        },
        {
          label: 'Plantillas contables',
          icon: 'account_tree',
          route: '/administracion/plantillas',
        },
        {
          label: 'Auditoría',
          icon: 'security',
          route: '/administracion/auditoria',
        },
        {
          label: 'Facturación DIAN',
          icon: 'receipt_long',
          route: '/administracion/dian',
          children: [
            {
              label: 'Resoluciones',
              icon: 'assignment',
              route: '/administracion/dian/resoluciones',
            },
            {
              label: 'Certificados',
              icon: 'verified_user',
              route: '/administracion/dian/certificados',
            },
            {
              label: 'Facturas electrónicas',
              icon: 'description',
              route: '/administracion/dian/facturas',
            },
          ],
        },
        {
          label: 'Config. de precios',
          icon: 'price_change',
          route: '/administracion/precios',
        },
        {
          label: 'Config. de empresa',
          icon: 'business',
          route: '/administracion/empresa',
        },
      ],
    },
    {
      key: 'terceros',
      label: 'Terceros',
      icon: 'contacts',
      route: '/terceros',
      roles: ['ADMIN', 'CAJERO', 'CONTADOR'],
      children: [
        { label: 'Clientes', icon: 'person', route: '/terceros/clientes' },
        { label: 'Proveedores', icon: 'local_shipping', route: '/terceros/proveedores' },
        { label: 'Otros', icon: 'people', route: '/terceros/otros', disabled: true },
      ],
    },
  ];

  readonly modules = computed(() => {
    const role = this.userRole();
    return this.allModules.filter((m) => !role || m.roles.includes(role));
  });

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly activeModule = computed(() => {
    const url = this.currentUrl();
    return (
      this.modules()
        .slice()
        .sort((a, b) => b.route.length - a.route.length)
        .find((m) => url.startsWith(m.route)) ?? null
    );
  });

  readonly sidenavChildren = computed(() => this.activeModule()?.children ?? []);

  readonly sidenavExpanded = signal(true);

  readonly showSidenav = computed(
    () => this.sidenavChildren().length > 0 && this.sidenavExpanded(),
  );

  constructor() {
    effect(() => {
      if (this.sidenavChildren().length > 0) {
        this.sidenavExpanded.set(true);
      }
    });
  }

  navigateToModule(mod: NavModule): void {
    this.router.navigate([mod.route]);
  }

  toggleSidenav(): void {
    this.sidenavExpanded.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
