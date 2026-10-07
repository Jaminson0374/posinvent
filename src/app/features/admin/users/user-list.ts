import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserListComponent {
  readonly service = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['username', 'employeeName', 'email', 'role', 'active', 'actions'];

  readonly pageSizeOptions = [10, 20, 30];

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly roleOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Todos los roles' },
    { value: 'ADMIN', label: 'ADMIN' },
    { value: 'ALMACENISTA', label: 'ALMACENISTA' },
    { value: 'CAJERO', label: 'CAJERO' },
    { value: 'CARNICERO', label: 'CARNICERO' },
    { value: 'AUXILIAR', label: 'AUXILIAR' },
    { value: 'CONTADOR', label: 'CONTADOR' },
  ];

  readonly activeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'true', label: 'Activos' },
    { value: 'false', label: 'Inactivos' },
  ];

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.service.search.set(value.trim());
        this.service.page.set(0);
      });
  }

  onRoleChange(value: string): void {
    this.service.roleFilter.set(value);
    this.service.page.set(0);
  }

  onActiveChange(value: string): void {
    this.service.activeFilter.set(value === '' ? null : value === 'true');
    this.service.page.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.service.page.set(event.pageIndex);
    this.service.size.set(event.pageSize);
  }
}
