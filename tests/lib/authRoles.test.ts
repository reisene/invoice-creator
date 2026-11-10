// @vitest-environment node
import { ADMIN_ROLE, hasAdminRole } from '@/lib/auth/roles';
import { describe, expect, it } from 'vitest';

describe('admin role recognition', () => {
  it('uses the Neon Auth admin role name', () => {
    expect(ADMIN_ROLE).toBe('admin');
  });

  it.each(['admin', ' admin ', 'user,admin', 'user, admin ,editor'])(
    'recognizes an exact admin role in %s',
    (role) => {
      expect(hasAdminRole(role)).toBe(true);
    },
  );

  it.each([
    undefined,
    null,
    '',
    ' ',
    'user',
    'superadmin',
    'admin-user',
    'ADMIN',
  ])('rejects a missing or non-admin role: %s', (role) => {
    expect(hasAdminRole(role)).toBe(false);
  });
});
