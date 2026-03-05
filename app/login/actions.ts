'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  clearClientSession,
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
    where: { ownerEmail: email, isActive: true }
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

  setClientSession(client.id);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function logoutClient() {
  clearClientSession();
  revalidatePath('/dashboard');
}
