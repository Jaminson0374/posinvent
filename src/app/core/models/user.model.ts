export type UserRole = 'ADMIN' | 'ALMACENISTA' | 'CAJERO' | 'CARNICERO' | 'AUXILIAR' | 'CONTADOR';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  isActive?: boolean;
  employeeId?: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  role: UserRole;
  userId: string;
  fullName: string;
  employeeId?: string;
}

export interface UserRequest {
  employeeId: string;
  email: string;
  roleId: string;
  isActive: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: RoleSummary;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tempPassword?: string;
  employeeId?: string;
  employeeName?: string;
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  permissions: string;
  createdAt: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
  numIdentification: string;
  email: string;
}
