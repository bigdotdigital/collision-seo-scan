import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'collision_client_session';

const secret = () =>
  process.env.CLIENT_AUTH_SECRET || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || 'dev-client-secret';

const sign = (value: string): string =>
  crypto.createHmac('sha256', secret()).update(value).digest('hex');

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
  const token = `${clientId}.${sign(clientId)}`;
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

export const getAuthedClient = async () => {
  const token = cookies().get(SESSION_COOKIE)?.value || '';
  const [clientId, signature] = token.split('.');
  if (!clientId || !signature) return null;
  if (sign(clientId) !== signature) return null;
  return prisma.client.findUnique({ where: { id: clientId } });
};
