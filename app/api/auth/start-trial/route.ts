import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  hashPortalPassword,
  setDashboardSession,
  verifyPortalPassword
} from '@/lib/client-auth';
import { seedDashboardFromScan } from '@/lib/dashboard-prefill';
import { claimShopForOrganization } from '@/lib/shop-data';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120),
  name: z.string().min(1).max(120).optional(),
  scanId: z.string().optional(),
  orgId: z.string().optional()
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function plusDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function ensureOrgDefaults(orgId: string, orgName: string, email: string) {
  const primaryLocation = await prisma.location.findFirst({
    where: { orgId, isPrimary: true },
    orderBy: { createdAt: 'asc' }
  });
  if (primaryLocation) {
    await prisma.location.update({
      where: { id: primaryLocation.id },
      data: {
        name: primaryLocation.name || orgName || 'Primary Location',
        isPrimary: true
      }
    });
  } else {
    await prisma.location.create({
      data: {
        orgId,
        isPrimary: true,
        name: orgName || 'Primary Location'
      }
    });
  }

  await prisma.alertPreference.upsert({
    where: { orgId },
    update: {
      digestEmail: email
    },
    create: {
      orgId,
      digestEmail: email
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email and password are required to start your free trial.' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const email = input.email.trim().toLowerCase();
    const requestedScan = input.scanId
      ? await prisma.scan.findUnique({
          where: { id: input.scanId },
          select: {
            id: true,
            shopId: true,
            organizationId: true,
            shopName: true,
            city: true,
            websiteUrl: true,
            moneyKeywordsJson: true,
            competitorsJson: true
          }
        })
      : null;

    let targetOrgId = input.orgId || requestedScan?.organizationId || '';

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: 'active' },
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (existingUser && !verifyPortalPassword(input.password, existingUser.passwordHash)) {
      return NextResponse.json(
        { error: 'That email already exists. Use the correct password or reset it in settings.' },
        { status: 401 }
      );
    }

    if (!targetOrgId && existingUser?.memberships[0]?.orgId) {
      targetOrgId = existingUser.memberships[0].orgId;
    }

    if (!targetOrgId) {
      const fallbackName =
        requestedScan?.shopName?.trim() || input.name?.trim() || `${email.split('@')[0]} Collision`;
      const org = await prisma.organization.create({
        data: {
          shopId: requestedScan?.shopId || undefined,
          name: fallbackName,
          city: requestedScan?.city || undefined,
          websiteUrl: requestedScan?.websiteUrl || undefined,
          slug: `${slugify(fallbackName) || 'shop'}-${Math.random().toString(36).slice(2, 8)}`
        }
      });
      targetOrgId = org.id;
    }

    const user =
      existingUser ||
      (await prisma.user.create({
        data: {
          email,
          passwordHash: hashPortalPassword(input.password),
          name: input.name?.trim() || requestedScan?.shopName?.trim() || email.split('@')[0],
          isActive: true
        }
      }));

    const membership = await prisma.orgMembership.upsert({
      where: {
        orgId_userId: {
          orgId: targetOrgId,
          userId: user.id
        }
      },
      update: {
        role: 'owner',
        status: 'active'
      },
      create: {
        orgId: targetOrgId,
        userId: user.id,
        role: 'owner',
        status: 'active'
      }
    });

    const org = await prisma.organization.findUnique({
      where: { id: targetOrgId },
      select: { name: true }
    });
    await ensureOrgDefaults(targetOrgId, org?.name || 'Primary Location', email);

    if (requestedScan?.shopId) {
      await claimShopForOrganization({
        orgId: targetOrgId,
        shopId: requestedScan.shopId,
        name: requestedScan.shopName,
        websiteUrl: requestedScan.websiteUrl,
        city: requestedScan.city
      });
    }

    if (requestedScan) {
      const seededKeywords = (() => {
        try {
          const parsed = JSON.parse(requestedScan.moneyKeywordsJson || '[]');
          if (!Array.isArray(parsed)) return [];
          return parsed
            .map((row) => ({ keyword: typeof row?.keyword === 'string' ? row.keyword : '' }))
            .filter((row) => row.keyword);
        } catch {
          return [];
        }
      })();

      const seededCompetitors = (() => {
        try {
          const parsed = JSON.parse(requestedScan.competitorsJson || '[]');
          if (!Array.isArray(parsed)) return [];
          return parsed
            .map((row) => ({
              name: typeof row?.name === 'string' ? row.name : '',
              url: typeof row?.url === 'string' ? row.url : ''
            }))
            .filter((row) => row.name);
        } catch {
          return [];
        }
      })();

      await seedDashboardFromScan({
        organizationId: targetOrgId,
        scanId: requestedScan.id,
        shopName: requestedScan.shopName || '',
        websiteUrl: requestedScan.websiteUrl || '',
        city: requestedScan.city || '',
        keywords: seededKeywords,
        competitors: seededCompetitors
      });

      await prisma.scan.update({
        where: { id: requestedScan.id },
        data: {
          organizationId: targetOrgId,
          shopId: requestedScan.shopId || undefined
        }
      });
    }

    const existingSubscription = await prisma.subscription.findUnique({
      where: { orgId: targetOrgId },
      select: { status: true }
    });
    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          orgId: targetOrgId,
          planTier: 'monitor',
          status: 'trialing',
          trialEndsAt: plusDays(30)
        }
      });
    } else if (!['trialing', 'active'].includes(existingSubscription.status)) {
      await prisma.subscription.update({
        where: { orgId: targetOrgId },
        data: {
          planTier: 'monitor',
          status: 'trialing',
          trialEndsAt: plusDays(30)
        }
      });
    }

    setDashboardSession({
      userId: user.id,
      orgId: targetOrgId,
      membershipRole: membership.role
    });

    return NextResponse.json({
      ok: true,
      url: '/dashboard/onboarding?trial=started'
    });
  } catch (error) {
    console.error('[auth:start-trial:error]', error);
    return NextResponse.json(
      { error: 'Unable to start trial right now. Please try again.' },
      { status: 500 }
    );
  }
}
