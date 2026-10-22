import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { SectionNavComponent, SectionNavItem } from './section-nav';

const SECTIONS: SectionNavItem[] = [
  { label: 'General', icon: 'dashboard', sectionId: 'general' },
  { label: 'Inventory', icon: 'inventory', sectionId: 'inventory' },
  { label: 'Accounting', icon: 'account_balance', sectionId: 'accounting' },
  { label: 'Suppliers', icon: 'local_shipping', sectionId: 'suppliers' },
  { label: 'Images', icon: 'image', sectionId: 'images' },
];

@Component({
  standalone: true,
  imports: [SectionNavComponent],
  template: `<app-section-nav
    [sections]="sections"
    [activeSection]="activeSection"
    (sectionChange)="onSectionChange($event)"
  />`,
})
class TestHost {
  sections: SectionNavItem[] = SECTIONS;
  activeSection = 'general';
  emittedSection = '';

  onSectionChange(id: string): void {
    this.emittedSection = id;
  }
}

describe('SectionNavComponent', () => {
  let hostFixture: ComponentFixture<TestHost>;
  let host: TestHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost, NoopAnimationsModule],
    }).compileComponents();
    hostFixture = TestBed.createComponent(TestHost);
    host = hostFixture.componentInstance;
  });

  /** Detect changes and stabilize — call once to init, call after mutations. */
  function detect(): void {
    hostFixture.detectChanges();
  }

  // ── renders all section items ──────────────────────────────────────
  it('should render all section items with labels and icons', () => {
    detect();
    const navItems = hostFixture.debugElement.queryAll(By.css('.sn-item'));
    expect(navItems).toHaveLength(5);

    const firstLabel = navItems[0].nativeElement.textContent;
    expect(firstLabel).toContain('General');

    const iconElements = hostFixture.debugElement.queryAll(By.css('.sn-item mat-icon'));
    expect(iconElements).toHaveLength(5);
  });

  // ── active section indicator ──────────────────────────────────────
  it('should mark the active section with a visual indicator', () => {
    detect();
    const activeItems = hostFixture.debugElement.queryAll(By.css('.sn-item--active'));
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0].nativeElement.textContent).toContain('General');
  });

  // ── TRIANGULATE: active state transfers on input change ────────────
  it('should transfer active state when activeSection input changes', () => {
    host.activeSection = 'inventory';
    detect();

    const activeItems = hostFixture.debugElement.queryAll(By.css('.sn-item--active'));
    expect(activeItems).toHaveLength(1);
    expect(activeItems[0].nativeElement.textContent).toContain('Inventory');

    const allItems = hostFixture.debugElement.queryAll(By.css('.sn-item'));
    const firstItem = allItems[0].nativeElement as HTMLElement;
    expect(firstItem.classList.contains('sn-item--active')).toBe(false);
  });

  // ── emits sectionChange on click ──────────────────────────────────
  it('should emit sectionChange when a nav item is clicked', () => {
    detect();
    const navItems = hostFixture.debugElement.queryAll(By.css('.sn-item'));
    (navItems[2].nativeElement as HTMLElement).click();
    detect();
    expect(host.emittedSection).toBe('accounting');
  });

  // ── TRIANGULATE: click on already-active still emits ──────────────
  it('should emit sectionChange even when clicking the active item', () => {
    detect();
    const navItems = hostFixture.debugElement.queryAll(By.css('.sn-item'));
    (navItems[0].nativeElement as HTMLElement).click();
    detect();
    expect(host.emittedSection).toBe('general');
  });

  // ── mobile scroll container ────────────────────────────────────────
  it('should render a horizontally scrollable container for mobile', () => {
    detect();
    const navEl = hostFixture.debugElement.query(By.css('.sn-nav'));
    expect(navEl).toBeTruthy();
    const navClasses = (navEl.nativeElement as HTMLElement).classList;
    expect(navClasses.contains('overflow-x-auto')).toBe(true);
  });

  // ── TRIANGULATE: dynamic sections update ──────────────────────────
  it('should update when sections input changes dynamically', () => {
    host.sections = [{ label: 'Only', icon: 'star', sectionId: 'only' }];
    detect();

    const navItems = hostFixture.debugElement.queryAll(By.css('.sn-item'));
    expect(navItems).toHaveLength(1);
    expect(navItems[0].nativeElement.textContent).toContain('Only');
  });
});
