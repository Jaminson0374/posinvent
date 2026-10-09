import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/set-password',
    loadComponent: () =>
      import('./features/auth/set-password/set-password').then((m) => m.SetPasswordComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'logistica',
        loadComponent: () =>
          import('./features/logistica/logistica').then((m) => m.LogisticaComponent),
        children: [
          { path: '', redirectTo: 'recepciones', pathMatch: 'full' },
          {
            path: 'recepciones',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/logistica/recepcion/receipt-list').then(
                    (m) => m.ReceiptListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/logistica/recepcion/receipt-form').then(
                    (m) => m.ReceiptFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/logistica/recepcion/receipt-form').then(
                    (m) => m.ReceiptFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'picking',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/logistica/picking/picking-list').then(
                    (m) => m.PickingListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/logistica/picking/picking-form').then(
                    (m) => m.PickingFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/logistica/picking/picking-form').then(
                    (m) => m.PickingFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'despachos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/logistica/despachos/shipment-list').then(
                    (m) => m.ShipmentListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/logistica/despachos/shipment-form').then(
                    (m) => m.ShipmentFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/logistica/despachos/shipment-form').then(
                    (m) => m.ShipmentFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'guias',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/logistica/guias/guide-list').then((m) => m.GuideListComponent),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/logistica/guias/guide-form').then((m) => m.GuideFormComponent),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/logistica/guias/guide-form').then((m) => m.GuideFormComponent),
              },
            ],
          },
        ],
      },
      {
        path: 'compras',
        loadComponent: () => import('./features/compras/compras').then((m) => m.ComprasComponent),
        children: [
          {
            path: 'ordenes',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/compras/ordenes/orden-list/orden-list').then(
                    (m) => m.OrdenListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/compras/ordenes/orden-form/orden-form').then(
                    (m) => m.OrdenFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/compras/ordenes/orden-form/orden-form').then(
                    (m) => m.OrdenFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'contabilidad',
            loadComponent: () =>
              import('./features/contabilidad/accounting-shell').then(
                (m) => m.AccountingShellComponent,
              ),
          },
          {
            path: 'anticipos',
            loadComponent: () =>
              import('./features/compras/anticipos/advance-list').then(
                (m) => m.AdvanceListComponent,
              ),
          },
          {
            path: 'anticipos/nuevo',
            loadComponent: () =>
              import('./features/compras/anticipos/advance-form').then(
                (m) => m.AdvanceFormComponent,
              ),
          },
          {
            path: 'notas',
            loadComponent: () =>
              import('./features/compras/notas/nota-list').then((m) => m.NotaListComponent),
          },
          {
            path: 'notas/nuevo',
            loadComponent: () =>
              import('./features/compras/notas/nota-form').then((m) => m.NotaFormComponent),
          },
          {
            path: 'notas/:id',
            loadComponent: () =>
              import('./features/compras/notas/nota-form').then((m) => m.NotaFormComponent),
          },
          {
            path: 'facturas',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/compras/facturas/factura-list/factura-list').then(
                    (m) => m.FacturaListComponent,
                  ),
              },
              {
                path: 'nueva',
                loadComponent: () =>
                  import('./features/compras/facturas/factura-form/factura-form').then(
                    (m) => m.FacturaFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'recepcion',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/compras/recepcion/recepcion-list/recepcion-list').then(
                    (m) => m.RecepcionListComponent,
                  ),
              },
              {
                path: 'nueva',
                loadComponent: () =>
                  import('./features/compras/recepcion/recepcion-form/recepcion-form').then(
                    (m) => m.RecepcionFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'devoluciones',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/compras/devoluciones/devolucion-list/devolucion-list').then(
                    (m) => m.DevolucionListComponent,
                  ),
              },
              {
                path: 'nueva',
                loadComponent: () =>
                  import('./features/compras/devoluciones/devolucion-form/devolucion-form').then(
                    (m) => m.DevolucionFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'reportes',
            loadComponent: () =>
              import('./features/compras/reportes/compras-reportes').then(
                (m) => m.ComprasReportesComponent,
              ),
          },
          {
            path: 'pagos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/compras/pagos/pago-list/pago-list').then(
                    (m) => m.PagoListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/compras/pagos/pago-form/pago-form').then(
                    (m) => m.PagoFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'historial',
            loadComponent: () =>
              import('./features/compras/historial/historial-list/historial-list').then(
                (m) => m.HistorialListComponent,
              ),
          },
          {
            path: 'retenciones',
            loadComponent: () =>
              import('./features/compras/retenciones/retencion-list/retencion-list').then(
                (m) => m.RetencionListComponent,
              ),
          },
          {
            path: 'proveedores',
            redirectTo: '/terceros/proveedores',
          },
          {
            path: 'cxp',
            loadComponent: () =>
              import('./features/compras/cxp/cxp-list').then((m) => m.CxpListComponent),
          },
        ],
      },
      {
        path: 'pos',
        loadComponent: () => import('./features/pos/pos').then((m) => m.PosComponent),
        children: [
          {
            path: 'turnos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/pos/turnos/shift-list').then((m) => m.ShiftListComponent),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/pos/turnos/shift-form').then((m) => m.ShiftFormComponent),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/pos/turnos/shift-form').then((m) => m.ShiftFormComponent),
              },
            ],
          },
          {
            path: 'venta',
            loadComponent: () =>
              import('./features/pos/venta/pos-venta').then((m) => m.PosVentaComponent),
          },
          {
            path: 'cotizaciones',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/pos/cotizaciones/quote-list').then(
                    (m) => m.QuoteListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/pos/cotizaciones/quote-form').then(
                    (m) => m.QuoteFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/pos/cotizaciones/quote-form').then(
                    (m) => m.QuoteFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'caja',
            loadComponent: () =>
              import('./features/pos/caja/cash-closing').then((m) => m.CashClosingComponent),
          },
          {
            path: 'arqueo',
            loadComponent: () =>
              import('./features/pos/caja/arqueo').then((m) => m.ArqueoComponent),
          },
          {
            path: 'devoluciones',
            loadComponent: () =>
              import('./features/pos/devoluciones/pos-devolution').then(
                (m) => m.PosDevolutionComponent,
              ),
          },
          { path: '', redirectTo: 'turnos', pathMatch: 'full' },
        ],
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario').then((m) => m.InventarioComponent),
        children: [
          {
            path: 'kardex',
            loadComponent: () =>
              import('./features/inventario/kardex/kardex-list').then((m) => m.KardexListComponent),
          },
          {
            path: 'ajustes',
            loadComponent: () =>
              import('./features/inventario/adjustments/adjustment-list').then(
                (m) => m.AdjustmentListComponent,
              ),
          },
          {
            path: 'ajustes/nuevo',
            loadComponent: () =>
              import('./features/inventario/adjustments/adjustment-form').then(
                (m) => m.AdjustmentFormComponent,
              ),
          },
          {
            path: 'stock-manual',
            loadComponent: () =>
              import('./features/inventario/stock-manual/stock-manual').then(
                (m) => m.StockManualComponent,
              ),
          },
          {
            path: 'traslados',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/inventario/transfers/transfer-list').then(
                    (m) => m.TransferListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/inventario/transfers/transfer-form').then(
                    (m) => m.TransferFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/inventario/transfers/transfer-detail').then(
                    (m) => m.TransferDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'decomisos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/inventario/disposals/disposal-list').then(
                    (m) => m.DisposalListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/inventario/disposals/disposal-form').then(
                    (m) => m.DisposalFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'produccion',
            loadComponent: () =>
              import('./features/inventario/produccion/production-list').then(
                (m) => m.ProductionListComponent,
              ),
          },
          {
            path: 'produccion/nuevo',
            loadComponent: () =>
              import('./features/inventario/produccion/production-batch').then(
                (m) => m.ProductionBatchComponent,
              ),
          },
          {
            path: 'produccion/:id',
            loadComponent: () =>
              import('./features/inventario/produccion/production-batch').then(
                (m) => m.ProductionBatchComponent,
              ),
          },
          {
            path: 'articulos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/admin/products/product-list/product-list').then(
                    (m) => m.ProductListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/admin/products/product-form/product-form').then(
                    (m) => m.ProductFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/admin/products/product-form/product-form').then(
                    (m) => m.ProductFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'bodegas',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/inventario/warehouses/warehouse-list/warehouse-list').then(
                    (m) => m.WarehouseListComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/inventario/warehouses/warehouse-detail/warehouse-detail').then(
                    (m) => m.WarehouseDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'lotes',
            loadComponent: () =>
              import('./features/inventario/batches/batch-list/batch-list').then(
                (m) => m.BatchListComponent,
              ),
          },
          {
            path: 'stock',
            loadComponent: () =>
              import('./features/inventario/stock/stock-summary/stock-summary').then(
                (m) => m.StockSummaryComponent,
              ),
          },
          {
            path: 'animales',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/inventario/animales/animal-list/animal-list').then(
                    (m) => m.AnimalListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/inventario/animales/animal-form/animal-form').then(
                    (m) => m.AnimalFormComponent,
                  ),
              },
              {
                path: ':id/faena',
                loadComponent: () =>
                  import('./features/inventario/animales/faena/faena').then(
                    (m) => m.FaenaComponent,
                  ),
              },
            ],
          },
          {
            path: 'desposte',
            loadComponent: () =>
              import('./features/inventario/desposte/desposte-manual/desposte-manual').then(
                (m) => m.DesposteManualComponent,
              ),
          },
          {
            path: 'precios',
            loadComponent: () =>
              import('./features/inventario/prices/price-list-list/price-list-list').then(
                (m) => m.PriceListListComponent,
              ),
          },
          { path: '', redirectTo: 'articulos', pathMatch: 'full' },
        ],
      },
      {
        path: 'produccion',
        children: [
          { path: '', redirectTo: 'ordenes', pathMatch: 'full' },
          {
            path: 'ordenes',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/production/orders/order-list').then(
                    (m) => m.OrderListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/production/orders/order-form').then(
                    (m) => m.OrderFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'maquinaria',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/production/machinery/machinery-list').then(
                    (m) => m.MachineryListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/production/machinery/machinery-form').then(
                    (m) => m.MachineryFormComponent,
                  ),
              },
            ],
          },
        ],
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas-layout').then((m) => m.VentasLayoutComponent),
        children: [
          {
            path: 'documentos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/ventas/document-list/sales-document-list').then(
                    (m) => m.SalesDocumentListComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/ventas/document-detail/sales-document-detail').then(
                    (m) => m.SalesDocumentDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'clientes',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/ventas/clientes/client-list').then(
                    (m) => m.ClientListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/ventas/clientes/client-form').then(
                    (m) => m.ClientFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/ventas/clientes/client-form').then(
                    (m) => m.ClientFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'cxc',
            loadComponent: () =>
              import('./features/ventas/cxc/cxc-list').then((m) => m.CxcListComponent),
          },
          {
            path: 'recibos',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/ventas/recibos/receipt-list').then(
                    (m) => m.ReceiptListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/ventas/recibos/receipt-form').then(
                    (m) => m.ReceiptFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'estados',
            loadComponent: () =>
              import('./features/ventas/estados/statement').then((m) => m.StatementComponent),
          },
          {
            path: 'cobranzas',
            loadComponent: () =>
              import('./features/ventas/cobranzas/collection-list').then(
                (m) => m.CollectionListComponent,
              ),
          },
          { path: '', redirectTo: 'documentos', pathMatch: 'full' },
        ],
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes-layout').then((m) => m.ReportesLayoutComponent),
        children: [
          {
            path: '',
            redirectTo: 'ventas',
            pathMatch: 'full',
          },
          {
            path: 'ventas',
            loadComponent: () =>
              import('./features/reportes/ventas-reportes').then((m) => m.VentasReportesComponent),
          },
          {
            path: 'clientes',
            loadComponent: () =>
              import('./features/reportes/client-history').then((m) => m.ClientHistoryComponent),
          },
          {
            path: 'rentabilidad',
            loadComponent: () =>
              import('./features/reportes/rentabilidad-reportes').then(
                (m) => m.RentabilidadReportesComponent,
              ),
          },
          {
            path: 'financieros',
            loadComponent: () =>
              import('./features/reportes/financieros-reportes').then(
                (m) => m.FinancierosReportesComponent,
              ),
          },
        ],
      },
      {
        path: 'administracion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/administracion/administracion-layout').then(
            (m) => m.AdministracionLayoutComponent,
          ),
        children: [
          { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/admin/users/user-list').then((m) => m.UserListComponent),
          },
          {
            path: 'usuarios/nuevo',
            loadComponent: () =>
              import('./features/admin/users/user-form').then((m) => m.UserFormComponent),
          },
          {
            path: 'usuarios/:id',
            loadComponent: () =>
              import('./features/admin/users/user-form').then((m) => m.UserFormComponent),
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./features/admin/roles/role-list').then((m) => m.RoleListComponent),
          },
          {
            path: 'empresa',
            loadComponent: () =>
              import('./features/admin/company/company-form').then((m) => m.CompanyFormComponent),
          },
          {
            path: 'puc',
            loadComponent: () =>
              import('./features/admin/puc/puc-list').then((m) => m.PucListComponent),
          },
          {
            path: 'puc/nuevo',
            loadComponent: () =>
              import('./features/admin/puc/puc-list').then((m) => m.PucListComponent),
          },
          {
            path: 'puc/:id',
            loadComponent: () =>
              import('./features/admin/puc/puc-list').then((m) => m.PucListComponent),
          },
          {
            path: 'precios',
            loadComponent: () =>
              import('./features/admin/prices/precios-tabs').then((m) => m.PreciosTabsComponent),
            children: [
              { path: '', redirectTo: 'listas', pathMatch: 'full' },
              {
                path: 'listas',
                loadComponent: () =>
                  import('./features/admin/prices/price-list-admin').then(
                    (m) => m.PriceListAdminComponent,
                  ),
              },
              {
                path: 'cliente',
                loadComponent: () =>
                  import('./features/admin/prices/custom-price-list').then(
                    (m) => m.CustomPriceListComponent,
                  ),
              },
              {
                path: 'cliente/nuevo',
                loadComponent: () =>
                  import('./features/admin/prices/custom-price-form').then(
                    (m) => m.CustomPriceFormComponent,
                  ),
              },
              {
                path: 'cliente/:id',
                loadComponent: () =>
                  import('./features/admin/prices/custom-price-form').then(
                    (m) => m.CustomPriceFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'auditoria',
            loadComponent: () =>
              import('./features/admin/audit/audit-log-list').then((m) => m.AuditLogListComponent),
          },
          {
            path: 'dian',
            children: [
              { path: '', redirectTo: 'resoluciones', pathMatch: 'full' },
              {
                path: 'resoluciones',
                loadComponent: () =>
                  import('./features/admin/dian/resolution-list').then(
                    (m) => m.ResolutionListComponent,
                  ),
              },
              {
                path: 'resoluciones/nuevo',
                loadComponent: () =>
                  import('./features/admin/dian/resolution-form').then(
                    (m) => m.ResolutionFormComponent,
                  ),
              },
              {
                path: 'resoluciones/:id',
                loadComponent: () =>
                  import('./features/admin/dian/resolution-form').then(
                    (m) => m.ResolutionFormComponent,
                  ),
              },
              {
                path: 'certificados',
                loadComponent: () =>
                  import('./features/admin/dian/certificate-list').then(
                    (m) => m.CertificateListComponent,
                  ),
              },
              {
                path: 'facturas',
                loadComponent: () =>
                  import('./features/admin/dian/electronic-invoice-list').then(
                    (m) => m.ElectronicInvoiceListComponent,
                  ),
              },
            ],
          },
          {
            path: 'plantillas',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/admin/plantillas/plantilla-list').then(
                    (m) => m.PlantillaListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/admin/plantillas/plantilla-form').then(
                    (m) => m.PlantillaFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/admin/plantillas/plantilla-form').then(
                    (m) => m.PlantillaFormComponent,
                  ),
              },
            ],
          },
        ],
      },
      {
        path: 'terceros',
        loadComponent: () =>
          import('./features/terceros/terceros').then((m) => m.TercerosComponent),
        children: [
          {
            path: 'clientes',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/admin/third-parties/third-party-list/third-party-list').then(
                    (m) => m.ThirdPartyListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/admin/third-parties/third-party-form/third-party-form').then(
                    (m) => m.ThirdPartyFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/admin/third-parties/third-party-form/third-party-form').then(
                    (m) => m.ThirdPartyFormComponent,
                  ),
              },
            ],
          },
          {
            path: 'proveedores',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/admin/third-parties/third-party-list/third-party-list').then(
                    (m) => m.ThirdPartyListComponent,
                  ),
              },
              {
                path: 'nuevo',
                loadComponent: () =>
                  import('./features/admin/third-parties/third-party-form/third-party-form').then(
                    (m) => m.ThirdPartyFormComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./features/admin/third-parties/third-party-form/third-party-form').then(
                    (m) => m.ThirdPartyFormComponent,
                  ),
              },
            ],
          },
          { path: '', redirectTo: 'clientes', pathMatch: 'full' },
        ],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
