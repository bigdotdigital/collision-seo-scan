import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { MembershipRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'collision_client_session';
const SESSION_VERSION = 'v2';

type DashboardSession = {
  userId: string;
  orgId: string;
  membershipRole: MembershipRole;
  clientId?: string | null;
};

const secret = () =>
  process.env.CLIENT_AUTH_SECRET || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || 'dev-client-secret';

const sign = (value: string): string =>
  crypto.createHmac('sha256', secret()).update(value).digest('hex');

const encodePayload = (value: DashboardSession): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const decodePayload = (value: string): DashboardSession | null => {
  try {
    const raw = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as Partial<DashboardSession>;
    if (!parsed.userId || !parsed.orgId || !parsed.membershipRole) return null;
    return {
      userId: parsed.userId,
      orgId: parsed.orgId,
      membershipRole: parsed.membershipRole,
      clientId: parsed.clientId || null
    };
  } catch {
    return null;
  }
};

const hashPasswordSync = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
};

const verifyPasswordSync = (password: string, stored: string): boolean => {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(test, 'hex'));
};

export const createPortalPassword = (): { plain: string; hash: string } => {
  const plain = crypto.randomBytes(5).toString('hex');
  const hash = hashPasswordSync(plain);
  return { plain, hash };
};

export const hashPortalPassword = (password: string): string =>
  hashPasswordSync(password);

export const setClientSession = (clientId: string) => {
  const existing = getDashboardSessionSync();
  if (existing) {
    setDashboardSession({
      userId: existing.userId,
      orgId: existing.orgId,
      membershipRole: existing.membershipRole,
      clientId
    });
    return;
  }

  const token = `${clientId}.${sign(clientId)}`;
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 14,
    path: '/'
  });
};

export const setDashboardSession = (session: DashboardSession) => {
  const payload = encodePayload(session);
  const token = `${SESSION_VERSION}.${payload}.${sign(`${SESSION_VERSION}.${payload}`)}`;
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 14,
    path: '/'
  });
};

export const clearClientSession = () => {
  cookies().delete(SESSION_COOKIE);
};

export const verifyPortalPassword = verifyPasswordSync;

const getDashboardSessionSync = (): DashboardSession | null => {
  const token = cookies().get(SESSION_COOKIE)?.value || '';
  const [version, payload, signature] = token.split('.');
  if (version !== SESSION_VERSION || !payload || !signature) return null;
  if (sign(`${version}.${payload}`) !== signature) return null;
  return decodePayload(payload);
};

export const getDashboardSession = async (): Promise<DashboardSession | null> => {
  const session = getDashboardSessionSync();
  if (!session) return null;

  const membership = await prisma.orgMembership.findFirst({
    where: {
      orgId: session.orgId,
      userId: session.userId,
      status: 'active'
    },
    select: { role: true, orgId: true, userId: true }
  });

  if (!membership) return null;

  return {
    ...session,
    membershipRole: membership.role
  };
};

export const getAuthedClient = async () => {
  const token = cookies().get(SESSION_COOKIE)?.value || '';

  const dashboardSession = await getDashboardSession();
  if (dashboardSession?.clientId) {
    return prisma.client.findUnique({ where: { id: dashboardSession.clientId } });
  }

  const [clientId, signature] = token.split('.');
  if (!clientId || !signature) return null;
  if (sign(clientId) !== signature) return null;
  return prisma.client.findUnique({ where: { id: clientId } });
};
