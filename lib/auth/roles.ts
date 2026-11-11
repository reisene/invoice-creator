export const ADMIN_ROLE = 'admin';

// Better Auth admin plugin stores multiple roles as a comma-separated string.
export function hasAdminRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return role
    .split(',')
    .map((value) => value.trim())
    .includes(ADMIN_ROLE);
}
