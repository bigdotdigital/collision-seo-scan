'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  clearClientSession,
  setDashboardSession,
  setClientSession,
  verifyPortalPassword
} from '@/lib/client-auth';

export async function loginClient(
  _prevState: { ok: boolean; message?: string },
  formData: FormData
) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { ok: false, message: 'Email and password are required.' };
  }

  const client = await prisma.client.findFirst({
    where: { ownerEmail: email, isActive: true },
    include: {
      scans: {
        where: { organizationId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { organizationId: true }
      }
    }
  });

  if (!client || !client.portalPasswordHash) {
    return {
      ok: false,
      message: 'Portal access not ready. Ask support for your invite credentials.'
    };
  }

  if (!verifyPortalPassword(password, client.portalPasswordHash)) {
    return { ok: false, message: 'Invalid credentials.' };
  }

  const organizationId = client.scans[0]?.organizationId || null;

  if (organizationId) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        isActive: true,
        passwordHash: client.portalPasswordHash,
        name: client.shopName
      },
      create: {
        email,
        passwordHash: client.portalPasswordHash,
        name: client.shopName,
        isActive: true
      }
    });

    const membership = await prisma.orgMembership.upsert({
      where: {
        orgId_userId: {
          orgId: organizationId,
          userId: user.id
        }
      },
      update: {
        role: 'owner',
        status: 'active'
      },
      create: {
        orgId: organizationId,
        userId: user.id,
        role: 'owner',
        status: 'active'
      }
    });

    setDashboardSession({
      userId: user.id,
      orgId: organizationId,
      membershipRole: membership.role,
      clientId: client.id
    });
  } else {
    setClientSession(client.id);
  }

  revalidatePath('/dashboard');
  return { ok: true };
}

export async function logoutClient() {
  clearClientSession();
  revalidatePath('/dashboard');
}
