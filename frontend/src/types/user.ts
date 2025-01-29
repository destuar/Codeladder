export type Role = 'USER' | 'ADMIN' | 'DEVELOPER';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
} 