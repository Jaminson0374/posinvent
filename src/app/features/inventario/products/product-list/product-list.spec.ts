import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductListComponent } from './product-list';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../core/models/product.model';
import { PageResponse } from '../../../../core/models/page.model';

registerLocaleData(localeEsCo);

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? `prod-${Math.random().toString(36).substring(2, 8)}`;
  return {
    id,
    productCode: `CODE-${id.substring(0, 6)}`,
    name: `Product ${id.substring(0, 6)}`,
    barcode: null,
    reference: null,
    description: null,
    productTypeId: null,
    productStateId: null,
    brandId: null,
    modelId: null,
    categoryId: null,
    groupId: null,
    unitOfMeasureId: null,
    costPrice: 1000,
    profitMargin: 0.3,
    taxType: 'IVA_19',
    salePrice: 1300,
    costingMethod: 'PROMEDIO_PONDERADO',
    initialStock: 50,
    minStock: 10,
    maxStock: 100,
    totalStock: 50,
    manufacturedInHouse: false,
    costAffectingExp: false,
    manageLots: false,
    perishable: false,
    belongsToProduct: false,
    sellBelowMin: false,
    inventoriable: true,
    serialNumber: null,
    originCountry: null,
    specifications: null,
    incomeAccountId: null,
    inventoryAccountId: null,
    costOfSalesAcctId: null,
    accountingTemplateId: null,
    active: true,
    version: 1,
    createdBy: 'test',
    createdAt: new Date().toISOString(),
    updatedBy: null,
    updatedAt: new Date().toISOString(),
    warehouses: [],
    suppliers: [],
    images: [],
    promotions: [],
    priceEntries: [],
    ...overrides,
  };
}

/** Products 1..count with deterministic values for predictable filtering tests. */
function createFullDataset(count: number): Product[] {
  const products: Product[] = [];
  for (let i = 1; i <= count; i++) {
    const id = `prod-${String(i).padStart(4, '0')}`;
    products.push(
      createProduct({
        id,
        productCode: `CODE-${String(i).padStart(4, '0')}`,
        name: i % 10 === 0 ? `Chori-artesanal ${i}` : `Product Name ${i}`,
        barcode: i % 3 === 0 ? `BAR-${String(i).padStart(4, '0')}` : null,
        active: i % 5 !== 0,
        initialStock: i % 7 === 0 ? 0 : i,
        totalStock: i % 7 === 0 ? 0 : i,
        minStock: 20,
        maxStock: 100,
        taxType: i % 8 === 0 ? 'EXENTO' : 'IVA_19',
      }),
    );
  }
  return products;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ProductListComponent — full-dataset filtering', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;
  let mockService: Partial<ProductService>;

  function stubSearchResponse(products: Product[]): void {
    const pageResponse: PageResponse<Product> = {
      content: products,
      page: 0,
      size: products.length,
      totalElements: products.length,
      totalPages: 1,
      last: true,
    };
    vi.mocked(mockService.search!).mockReturnValue(of(pageResponse));
  }

  beforeEach(async () => {
    mockService = {
      page: signal(0),
      pageSize: signal(20),
      query: signal(''),
      search: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProductListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: ProductService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  // -----------------------------------------------------------------------
  // RED tests — these will FAIL until 5.1 is implemented
  // -----------------------------------------------------------------------

  it('status filter operates on full dataset, not just page 1', () => {
    // 70 products. below-min-stock: initialStock < minStock(20)
    // This means indices 1-19 (stock 1-19 < 20) → 19 below-min products
    // Also indices 7,14 (stock 0 < 20, but already covered by 1-19)
    const products = createFullDataset(70);
    stubSearchResponse(products);

    // Init loads full dataset
    fixture.detectChanges();

    // Apply below-min-stock filter
    component.selectedFilters.set(['below-min-stock']);
    component.service.page.set(0);
    fixture.detectChanges();

    // filteredRows() MUST return ALL matching products from the full dataset
    const filtered = component.filteredRows();
    // below-min-stock: initialStock < minStock(20)
    // Products 1-19 have stock=i < 20 (19 products)
    // Products 21,28,35,42,49,56,63,70 have stock=0 < 20 (8 products)
    // Total: 27 below-min products across full dataset
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBe(27);

    // Verify paginator metadata shows correct total
    const pageData = component.data();
    expect(pageData).not.toBeNull();
    expect(pageData!.totalElements).toBe(27);
    expect(pageData!.content.length).toBeLessThanOrEqual(20); // paged slice
  });

  it('text search finds products on page 3+', () => {
    // 70 products. "Chori" in name at indices 10,20,30,40,50,60 (6 products)
    // Product at index 30 is on page 2 (pages are 0-indexed, page 0: 0-19, page 1: 20-39)
    const products = createFullDataset(70);
    stubSearchResponse(products);

    fixture.detectChanges();

    // Set search text directly (bypasses debounce in test)
    component.searchText.set('Chori');
    component.service.page.set(0);
    fixture.detectChanges();

    const filtered = component.filteredRows();
    expect(filtered.length).toBe(7); // indices 10,20,30,40,50,60,70 — wait, 70/10=7 means 7 products
    // Actually: 10,20,30,40,50,60,70 = 7 products

    // Product from page 3+ (page 2 = indices 40-59)
    const page3Product = filtered.find((p) => p.productCode === 'CODE-0040');
    expect(page3Product).toBeDefined();
    expect(page3Product!.name).toContain('Chori');

    // Product from page 4+ (page 3 = indices 60-79)
    const page4Product = filtered.find((p) => p.productCode === 'CODE-0070');
    expect(page4Product).toBeDefined();
    expect(page4Product!.name).toContain('Chori');
  });

  it('combined text + status filter across full dataset', () => {
    // Custom dataset: text matches on i%10===0, exempt on i%15===0
    const customProducts: Product[] = [];
    for (let i = 1; i <= 70; i++) {
      const isChori = i % 10 === 0; // 10,20,30,40,50,60,70
      const isExempt = i % 15 === 0; // 15,30,45,60
      customProducts.push(
        createProduct({
          id: `cust-${String(i).padStart(4, '0')}`,
          productCode: `CUST-${String(i).padStart(4, '0')}`,
          name: isChori ? `Chori Special ${i}` : `Regular Product ${i}`,
          taxType: isExempt ? 'EXENTO' : 'IVA_19',
          active: true,
          initialStock: 50,
          totalStock: 50,
          minStock: 10,
        }),
      );
    }

    stubSearchResponse(customProducts);
    fixture.detectChanges();

    // Text = "Chori" → 7 products
    component.searchText.set('Chori');
    component.service.page.set(0);
    fixture.detectChanges();

    let filtered = component.filteredRows();
    expect(filtered.length).toBe(7);

    // Add exempt filter → narrows to Chori + EXENTO (30, 60)
    component.selectedFilters.set(['exempt']);
    fixture.detectChanges();

    filtered = component.filteredRows();
    expect(filtered.length).toBe(2);

    // Product on page 2 (index 30 is on page 1 in 0-based pagination with size 20)
    const page2Product = filtered.find((p) => p.productCode === 'CUST-0030');
    expect(page2Product).toBeDefined();

    // Paginator matches
    const pageData = component.data();
    expect(pageData?.totalElements).toBe(2);
  });

  it('paginator resets to page 0 when filters change', () => {
    const products = createFullDataset(70);
    stubSearchResponse(products);

    fixture.detectChanges();

    // Navigate to page 2
    component.service.page.set(2);
    fixture.detectChanges();

    expect(component.service.page()).toBe(2);

    // Apply filter via FormControl (triggers valueChanges subscription)
    component.filterControl.setValue(['inactive']);
    fixture.detectChanges();

    expect(component.service.page()).toBe(0);
  });

  it('filteredRows() returns all products when no filters active', () => {
    const products = createFullDataset(50);
    stubSearchResponse(products);

    fixture.detectChanges();

    const filtered = component.filteredRows();
    expect(filtered.length).toBe(50);

    // data() should be paginated — only current page in content
    const pageData = component.data();
    expect(pageData).not.toBeNull();
    expect(pageData!.content.length).toBe(20); // pageSize=20, page 0
    expect(pageData!.totalElements).toBe(50);
  });

  it('data() returns correct page 2 content', () => {
    const products = createFullDataset(70);
    stubSearchResponse(products);

    fixture.detectChanges();

    // Navigate to page 2 (third page, 0-indexed)
    component.service.page.set(2);
    fixture.detectChanges();

    const pageData = component.data();
    expect(pageData).not.toBeNull();
    expect(pageData!.page).toBe(2);
    expect(pageData!.content.length).toBe(20);
    expect(pageData!.content[0].productCode).toBe('CODE-0041'); // index 40
    expect(pageData!.totalElements).toBe(70);
  });

  it('empty dataset shows no rows', () => {
    stubSearchResponse([]);

    fixture.detectChanges();

    const filtered = component.filteredRows();
    expect(filtered.length).toBe(0);

    const pageData = component.data();
    expect(pageData).not.toBeNull();
    expect(pageData!.totalElements).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Visual alignment spec (task 5.4)
// ---------------------------------------------------------------------------

import { By } from '@angular/platform-browser';

describe('ProductListComponent — visual alignment', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;
  let mockService: Partial<ProductService>;

  function stubSearchResponse(products: Product[]): void {
    const pageResponse: PageResponse<Product> = {
      content: products,
      page: 0,
      size: products.length,
      totalElements: products.length,
      totalPages: 1,
      last: true,
    };
    vi.mocked(mockService.search!).mockReturnValue(of(pageResponse));
  }

  beforeEach(async () => {
    mockService = {
      page: signal(0),
      pageSize: signal(20),
      query: signal(''),
      search: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProductListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: ProductService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  it('RED: renders stat cards with icon + value structure', () => {
    const products = createFullDataset(10);
    stubSearchResponse(products);

    fixture.detectChanges();

    const statCards = fixture.debugElement.queryAll(By.css('.stat-card'));
    expect(statCards.length).toBe(4);

    // Each stat card has an icon
    for (const card of statCards) {
      const icon = card.query(By.css('.stat-icon mat-icon'));
      expect(icon).not.toBeNull();
    }

    // First card shows total
    const firstCard = statCards[0].nativeElement as HTMLElement;
    expect(firstCard.textContent).toContain('Total artículos');
    expect(firstCard.textContent).toContain('10');
  });

  it('RED: renders hero section with icon and action buttons', () => {
    const products = createFullDataset(5);
    stubSearchResponse(products);

    fixture.detectChanges();

    const hero = fixture.debugElement.query(By.css('.page-hero'));
    expect(hero).not.toBeNull();

    const heroIcon = hero.query(By.css('.hero-icon mat-icon'));
    expect(heroIcon).not.toBeNull();

    const newBtn = hero.query(By.css('.btn-new'));
    expect(newBtn).not.toBeNull();
    expect(newBtn.nativeElement.textContent).toContain('Nuevo artículo');
  });

  it('RED: renders table card with view toggle and paginator', () => {
    const products = createFullDataset(30);
    stubSearchResponse(products);

    fixture.detectChanges();

    const tableCard = fixture.debugElement.query(By.css('.table-card'));
    expect(tableCard).not.toBeNull();

    const viewToggle = fixture.debugElement.query(By.css('.toolbar-view-toggle'));
    expect(viewToggle).not.toBeNull();
  });

  it('RED: renders empty state with icon when no data', () => {
    stubSearchResponse([]);

    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).not.toBeNull();

    const emptyIcon = emptyState.query(By.css('.empty-icon'));
    expect(emptyIcon).not.toBeNull();
  });
});
