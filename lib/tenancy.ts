import { redirect } from 'next/navigation';
import type { MembershipRole } from '@prisma/client';
import { getDashboardSession } from '@/lib/client-auth';

export type DashboardTenantContext = {
  userId: string;
  orgId: string;
  membershipRole: MembershipRole;
  clientId: string | null;
};

export async function requireDashboardTenant(): Promise<DashboardTenantContext> {
  const session = await getDashboardSession();
  if (!session) {
    redirect('/login');
  }

  return {
    userId: session.userId,
    orgId: session.orgId,
    membershipRole: session.membershipRole,
    clientId: session.clientId || null
  };
}

export function orgWhere<T extends Record<string, unknown>>(orgId: string, where?: T) {
  return {
    ...(where || {}),
    orgId
  } as T & { orgId: string };
}

