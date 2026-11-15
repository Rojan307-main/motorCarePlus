import { RoleEnum } from '../enums/role.enum';

// req.user comes from OptionalJwtGuard: the logged-in user, or null/undefined for a visitor.
// Uses the same field as RolesGuard (user.roles).
export function isAdminUser(user?: { roles?: string[] } | null): boolean {
  return !!user?.roles?.includes(RoleEnum.ADMIN);
}