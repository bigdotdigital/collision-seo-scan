import { redirect } from 'next/navigation';
import { getAuthedClient, getDashboardSession } from '@/lib/client-auth';
import { prisma } from '@/lib/prisma';
import type { MembershipRole } from '@prisma/client';

export async function requireDashboardClient() {
  const client = await getAuthedClient();
  if (!client || !client.isActive) {
    redirect('/login');
  }
  return client;
}

export async function requireDashboardContext() {
  const session = await getDashboardSession();
  if (session) return session;

  const client = await getAuthedClient();
  if (!client) redirect('/login');

  const scanWithOrg = await prisma.scan.findFirst({
    where: {
      clientId: client.id,
      organizationId: { not: null }
    },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true }
  });

  if (!scanWithOrg?.organizationId) {
    redirect('/login');
  }

  return {
    userId: `legacy-client-${client.id}`,
    orgId: scanWithOrg.organizationId,
    membershipRole: 'owner' as MembershipRole,
    clientId: client.id
  };
}
