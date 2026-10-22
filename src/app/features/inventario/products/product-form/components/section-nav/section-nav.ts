import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';

export interface SectionNavItem {
  label: string;
  icon: string;
  sectionId: string;
}

@Component({
  selector: 'app-section-nav',
  standalone: true,
  imports: [MatIconModule, MatRippleModule],
  templateUrl: './section-nav.html',
  styleUrl: './section-nav.css',
})
export class SectionNavComponent {
  readonly sections = input.required<SectionNavItem[]>();
  readonly activeSection = input.required<string>();
  readonly sectionChange = output<string>();

  onItemClick(sectionId: string): void {
    this.sectionChange.emit(sectionId);
  }
}
