'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createPortalPassword, hashPortalPassword } from '@/lib/client-auth';
import { sendFollowupEmail, sendPortalInviteEmail } from '@/lib/email';
import { buildDefaultKeywords, createMetricSnapshot, oemSignalsFromScan } from '@/lib/client-services';
import { upsertOrganizationFromInput } from '@/lib/org-data';
import { seedDashboardFromScan } from '@/lib/dashboard-prefill';

const COOKIE_NAME = 'collision_admin_auth';

function adminCookieMatches() {
  const expected = process.env.ADMIN_PASSWORD || '';
  const current = cookies().get(COOKIE_NAME)?.value || '';
  return Boolean(expected && current && current === expected);
}

export async function loginAdmin(
  _prevState: { ok: boolean; message?: string },
  formData: FormData
) {
  const pwd = String(formData.get('password') || '');
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || pwd !== expected) {
    return { ok: false, message: 'Invalid password' };
  }

  cookies().set(COOKIE_NAME, pwd, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/'
  });

  return { ok: true };
}

export async function logoutAdmin() {
  cookies().delete(COOKIE_NAME);
}

export async function isAdminAuthed() {
  return adminCookieMatches();
}

export async function convertScanToClient(formData: FormData) {
  if (!adminCookieMatches()) return;

  const scanId = String(formData.get('scanId') || '');
  const plan = String(formData.get('plan') || 'leadgen') as 'leadgen' | 'seo_retainer' | 'dashboard_only';

  if (!scanId) return;

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return;

  if (scan.clientId) {
    return;
  }

  const { plain, hash } = createPortalPassword();
  const oemSignals = await oemSignalsFromScan(scanId);

  const client = await prisma.client.create({
    data: {
      shopName: scan.shopName,
      city: scan.city,
      websiteUrl: scan.websiteUrl,
      ownerEmail: scan.email || `no-email-${scan.id}@example.local`,
      ownerPhone: scan.phone,
      plan,
      isActive: true,
      primaryScanId: scan.id,
      portalPasswordHash: hash,
      scans: {
        connect: { id: scan.id }
      },
      keywords: {
        createMany: {
          data: buildDefaultKeywords(scan.city, oemSignals)
        }
      }
    }
  });

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      status: 'client',
      clientId: client.id
    }
  });

  await createMetricSnapshot(client.id);

  const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login`;

  if (scan.email) {
    await sendPortalInviteEmail({
      to: scan.email,
      shopName: scan.shopName,
      loginUrl,
      password: plain
    });
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/client/${client.id}`);

  console.log(
    scan.email
      ? `[admin] converted scan ${scan.id} to client ${client.id}`
      : `[admin] converted scan ${scan.id}; temp password ${plain}`
  );
}

export async function sendScanFollowupNow(formData: FormData) {
  if (!adminCookieMatches()) return;
  const scanId = String(formData.get('scanId') || '');
  if (!scanId) return;

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan || !scan.email) return;

  const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/report/${scan.id}`;
  await sendFollowupEmail({
    to: scan.email,
    shopName: scan.shopName,
    reportUrl
  });

  await prisma.scan.update({ where: { id: scan.id }, data: { followupSent: true } });
  revalidatePath('/admin');
}

export async function forceRefreshClientSnapshot(formData: FormData) {
  if (!adminCookieMatches()) return;

  const clientId = String(formData.get('clientId') || '');
  if (!clientId) return;

  await createMetricSnapshot(clientId);
  revalidatePath(`/admin/client/${clientId}`);
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/keywords');
}

function demoConfig() {
  const demoEmail = process.env.DEMO_CLIENT_EMAIL || 'demo@collisionseoscan.local';
  const demoPassword = process.env.DEMO_CLIENT_PASSWORD || 'demo1234';
  const city = process.env.DEMO_CLIENT_CITY || 'Denver';
  const shopName = process.env.DEMO_CLIENT_SHOP || 'Mile High Collision Demo';
  const websiteUrl = process.env.DEMO_CLIENT_SITE || 'https://example.com';
  return { demoEmail, demoPassword, city, shopName, websiteUrl };
}

async function seedDemoClient() {
  const { demoEmail, demoPassword, city, shopName, websiteUrl } = demoConfig();
  const defaultKeywords = buildDefaultKeywords(city, ['subaru', 'ford', 'gm']);
  const defaultCompetitors = [
    { name: `${city} Collision Center`, url: '' },
    { name: `Premier Auto Body ${city}`, url: '' },
    { name: `Certified Collision ${city}`, url: '' }
  ];

  const org = await upsertOrganizationFromInput({
    shop_name: shopName,
    website_url: websiteUrl,
    city_or_zip: city,
    vertical: 'collision'
  });

  const existing = await prisma.client.findFirst({
    where: { ownerEmail: demoEmail },
    select: { id: true }
  });

  if (existing) {
    await prisma.scan.updateMany({
      where: { clientId: existing.id, organizationId: null },
      data: { organizationId: org.id }
    });

    await seedDashboardFromScan({
      organizationId: org.id,
      shopName,
      websiteUrl,
      city,
      keywords: defaultKeywords.map((row) => ({ keyword: row.keyword })),
      competitors: defaultCompetitors
    });

    await createMetricSnapshot(existing.id);
    revalidatePath('/admin');
    revalidatePath(`/admin/client/${existing.id}`);
    return;
  }

  const client = await prisma.client.create({
    data: {
      shopName,
      city,
      websiteUrl,
      ownerEmail: demoEmail,
      ownerPhone: '(303) 555-0142',
      plan: 'seo_retainer',
      isActive: true,
      notes: 'Demo client generated from admin one-click seed.',
      portalPasswordHash: hashPortalPassword(demoPassword),
      keywords: {
        createMany: {
          data: defaultKeywords
        }
      }
    }
  });

  const scan = await prisma.scan.create({
    data: {
      shopName,
      city,
      websiteUrl,
      email: demoEmail,
      phone: '(303) 555-0142',
      scoreTotal: 67,
      scoreWebsite: 64,
      scoreLocal: 71,
      scoreIntent: 66,
      issuesJson: '[]',
      moneyKeywordsJson: '[]',
      competitorsJson: '[]',
      rawChecksJson: '{}',
      thirtyDayPlanJson: '[]',
      status: 'client',
      clientId: client.id,
      organizationId: org.id
    }
  });

  await prisma.client.update({
    where: { id: client.id },
    data: { primaryScanId: scan.id }
  });

  await createMetricSnapshot(client.id);
  await seedDashboardFromScan({
    organizationId: org.id,
    shopName,
    websiteUrl,
    city,
    keywords: defaultKeywords.map((row) => ({ keyword: row.keyword })),
    competitors: defaultCompetitors
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/client/${client.id}`);

  console.log(
    `[admin] demo client created: ${client.id} email=${demoEmail} password=${demoPassword}`
  );
}

export async function createDemoClient() {
  if (!adminCookieMatches()) return;
  await seedDemoClient();
}

export async function resetDemoClient() {
  if (!adminCookieMatches()) return;

  const { demoEmail, shopName, websiteUrl } = demoConfig();
  const existing = await prisma.client.findFirst({
    where: { ownerEmail: demoEmail },
    select: { id: true }
  });

  if (existing) {
    await prisma.scan.updateMany({
      where: { clientId: existing.id },
      data: { clientId: null, status: 'lead' }
    });

    await prisma.client.delete({ where: { id: existing.id } });
  }

  await prisma.scan.deleteMany({
    where: {
      email: demoEmail,
      shopName,
      websiteUrl
    }
  });

  await seedDemoClient();
}
