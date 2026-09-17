export type UserRole = 'Administrador' | 'Equipo Pastoral' | 'Coordinador' | 'Auditor';

export interface CrmUser {
  id: string;
  name: string;
  emailOrUser: string;
  role: UserRole;
  status: 'Activo' | 'Inactivo';
  lastLogin?: string;
}

export interface AuthSession {
  user: CrmUser;
  token: string;
  loginTime: string;
  expiresAt: number;
}
