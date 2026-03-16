import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  hashPortalPassword,
  setDashboardSession,
  verifyPortalPassword
} from '@/lib/client-auth';
import { seedDashboardFromScan } from '@/lib/dashboard-prefill';
import { getPasswordPolicyError } from '@/lib/password-policy';
import { consumeRequestThrottle } from '@/lib/request-throttle';
import { claimShopForOrganization, ShopClaimConflictError } from '@/lib/shop-data';
import {
  createUniqueOrganizationSlug,
  seededCompetitorsFromJson,
  seededKeywordsFromJson
} from '@/lib/self-serve';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120),
  name: z.string().min(1).max(120).optional(),
  scanId: z.string().optional(),
  orgId: z.string().optional()
});

function plusDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function ensureOrgDefaults(
  tx: Prisma.TransactionClient,
  orgId: string,
  orgName: string,
  email: string
) {
  const primaryLocation = await tx.location.findFirst({
    where: { orgId, isPrimary: true },
    orderBy: { createdAt: 'asc' }
  });
  if (primaryLocation) {
    await tx.location.update({
      where: { id: primaryLocation.id },
      data: {
        name: primaryLocation.name || orgName || 'Primary Location',
        isPrimary: true
      }
    });
  } else {
    await tx.location.create({
      data: {
        orgId,
        isPrimary: true,
        name: orgName || 'Primary Location'
      }
    });
  }

  await tx.alertPreference.upsert({
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

function requestIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
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
    const throttle = consumeRequestThrottle({
      bucket: 'start-trial',
      keyParts: [email, requestIp(req)],
      limit: 6,
      windowMs: 15 * 60 * 1000
    });
    if (!throttle.ok) {
      return NextResponse.json(
        {
          error: `Too many signup attempts. Please wait about ${throttle.retryAfterSeconds} seconds and try again.`
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(throttle.retryAfterSeconds)
          }
        }
      );
    }

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

    if (!existingUser) {
      const passwordError = getPasswordPolicyError(input.password);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
    }

    if (existingUser && !verifyPortalPassword(input.password, existingUser.passwordHash)) {
      return NextResponse.json(
        { error: 'That email already exists. Use the correct password or reset it in settings.' },
        { status: 401 }
      );
    }

    if (!targetOrgId && existingUser?.memberships[0]?.orgId) {
      targetOrgId = existingUser.memberships[0].orgId;
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      let resolvedOrgId = targetOrgId;

      if (!resolvedOrgId) {
        const fallbackName =
          requestedScan?.shopName?.trim() ||
          input.name?.trim() ||
          `${email.split('@')[0]} Collision`;
        const org = await tx.organization.create({
          data: {
            shopId: requestedScan?.shopId || undefined,
            name: fallbackName,
            city: requestedScan?.city || undefined,
            websiteUrl: requestedScan?.websiteUrl || undefined,
            slug: await createUniqueOrganizationSlug(tx, fallbackName)
          }
        });
        resolvedOrgId = org.id;
      }

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              isActive: true,
              name:
                existingUser.name ||
                input.name?.trim() ||
                requestedScan?.shopName?.trim() ||
                email.split('@')[0]
            }
          })
        : await tx.user.create({
            data: {
              email,
              passwordHash: hashPortalPassword(input.password),
              name:
                input.name?.trim() ||
                requestedScan?.shopName?.trim() ||
                email.split('@')[0],
              isActive: true
            }
          });

      const membership = await tx.orgMembership.upsert({
        where: {
          orgId_userId: {
            orgId: resolvedOrgId,
            userId: user.id
          }
        },
        update: {
          role: 'owner',
          status: 'active'
        },
        create: {
          orgId: resolvedOrgId,
          userId: user.id,
          role: 'owner',
          status: 'active'
        }
      });

      const org = await tx.organization.findUnique({
        where: { id: resolvedOrgId },
        select: { name: true }
      });
      await ensureOrgDefaults(tx, resolvedOrgId, org?.name || 'Primary Location', email);

      const existingSubscription = await tx.subscription.findUnique({
        where: { orgId: resolvedOrgId },
        select: { status: true }
      });
      if (!existingSubscription) {
        await tx.subscription.create({
          data: {
            orgId: resolvedOrgId,
            planTier: 'monitor',
            status: 'trialing',
            trialEndsAt: plusDays(30)
          }
        });
      } else if (!['trialing', 'active'].includes(existingSubscription.status)) {
        await tx.subscription.update({
          where: { orgId: resolvedOrgId },
          data: {
            planTier: 'monitor',
            status: 'trialing',
            trialEndsAt: plusDays(30)
          }
        });
      }

      return {
        orgId: resolvedOrgId,
        userId: user.id,
        membershipRole: membership.role
      };
    });
    targetOrgId = transactionResult.orgId;

    if (requestedScan?.shopId) {
      try {
        await claimShopForOrganization({
          orgId: targetOrgId,
          shopId: requestedScan.shopId,
          name: requestedScan.shopName,
          websiteUrl: requestedScan.websiteUrl,
          city: requestedScan.city
        });
      } catch (error) {
        if (error instanceof ShopClaimConflictError) {
          return NextResponse.json(
            { error: 'This workspace is already linked to a different shop record. Please contact support before claiming this scan.' },
            { status: 409 }
          );
        }
        throw error;
      }
    }

    if (requestedScan) {
      await seedDashboardFromScan({
        organizationId: targetOrgId,
        scanId: requestedScan.id,
        shopName: requestedScan.shopName || '',
        websiteUrl: requestedScan.websiteUrl || '',
        city: requestedScan.city || '',
        keywords: seededKeywordsFromJson(requestedScan.moneyKeywordsJson),
        competitors: seededCompetitorsFromJson(requestedScan.competitorsJson)
      });

      await prisma.scan.update({
        where: { id: requestedScan.id },
        data: {
          organizationId: targetOrgId,
          shopId: requestedScan.shopId || undefined
        }
      });
    }

    setDashboardSession({
      userId: transactionResult.userId,
      orgId: targetOrgId,
      membershipRole: transactionResult.membershipRole
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
