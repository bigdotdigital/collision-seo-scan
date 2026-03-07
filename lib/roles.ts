import type { MembershipRole } from '@prisma/client';

const ROLE_ORDER: Record<MembershipRole, number> = {
  viewer: 0,
  manager: 1,
  owner: 2,
  agency_admin: 3
};

export function hasRoleAtLeast(role: MembershipRole, required: MembershipRole): boolean {
  return ROLE_ORDER[role] >= ROLE_ORDER[required];
}

export function canManageSettings(role: MembershipRole): boolean {
  return hasRoleAtLeast(role, 'manager');
}

export function canManageBilling(role: MembershipRole): boolean {
  return role === 'owner' || role === 'agency_admin';
}

