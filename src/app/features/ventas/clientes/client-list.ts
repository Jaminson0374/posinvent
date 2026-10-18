import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ThirdPartyService } from '../../../core/services/third-party.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css',
})
export class ClientListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly service = inject(ThirdPartyService);

  readonly displayedColumns = [
    'index',
    'numIdentification',
    'name',
    'email',
    'phone',
    'creditLimit',
    'creditDays',
    'outstanding',
    'actions',
  ];
  readonly pageSizeOptions = [10, 20, 30];

  readonly searchControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.service.typeFilter.set('CLIENT');

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.service.query.set(value.trim());
        this.service.page.set(0);
      });
  }

  openNew(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  openEdit(id: string): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  onPageChange(ev: PageEvent): void {
    if (ev.pageSize !== this.service.pageSize()) {
      this.service.pageSize.set(ev.pageSize);
      this.service.page.set(0);
    } else {
      this.service.page.set(ev.pageIndex);
    }
  }
}
