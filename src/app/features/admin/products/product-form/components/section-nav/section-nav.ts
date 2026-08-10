import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input({ required: true }) sections!: SectionNavItem[];
  @Input({ required: true }) activeSection!: string;
  @Output() sectionChange = new EventEmitter<string>();

  onItemClick(sectionId: string): void {
    this.sectionChange.emit(sectionId);
  }
}
