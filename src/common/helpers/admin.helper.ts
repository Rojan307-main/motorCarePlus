import { RoleEnum } from '../enums/role.enum';

export function isAdminUser(user?: { role?: string } | null): boolean {
  return user?.role === RoleEnum.ADMIN;
}