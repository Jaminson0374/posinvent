import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoleResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin/roles';

  listAll(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.base);
  }
}
