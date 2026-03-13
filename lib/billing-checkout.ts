import { prisma } from '@/lib/prisma';
import {
  getAuthedClient,
  getDashboardSession,
  hashPortalPassword,
  setDashboardSession,
  verifyPortalPassword
} from '@/lib/client-auth';
import { createStripePortalSession } from '@/lib/stripe';
import { seedDashboardFromScan } from '@/lib/dashboard-prefill';
import { claimShopForOrganization, ShopClaimConflictError } from '@/lib/shop-data';
import {
  createOrganizationSlug,
  seededCompetitorsFromJson,
  seededKeywordsFromJson
} from '@/lib/self-serve';

type StripeResponse = {
  id?: string;
  url?: string;
  email?: string;
  error?: {
    message?: string;
  };
};

type RequestedScan = {
  id: string;
  shopId: string | null;
  organizationId: string | null;
  email: string | null;
  shopName: string;
  websiteUrl: string;
  city: string;
  moneyKeywordsJson: string;
  competitorsJson: string;
};

export async function resolveOrgContext() {
  const session = await getDashboardSession();
  if (session?.orgId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });
    return { orgId: session.orgId, email: user?.email || null };
  }

  const client = await getAuthedClient();
  if (!client) return null;

  const scan = await prisma.scan.findFirst({
    where: { clientId: client.id, organizationId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true }
  });
  if (!scan?.organizationId) return null;

  return { orgId: scan.organizationId, email: client.ownerEmail || null };
}

export async function ensureSelfServeOrg(input: {
  email: string;
  name?: string;
  password: string;
  shopId?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  });

  if (existingUser) {
    if (!verifyPortalPassword(input.password, existingUser.passwordHash)) {
      return { ok: false as const, reason: 'invalid_password' as const };
    }
    const membership = existingUser.memberships[0];
    if (membership) {
      setDashboardSession({
        userId: existingUser.id,
        orgId: membership.orgId,
        membershipRole: membership.role
      });
      return { ok: true as const, orgId: membership.orgId, email };
    }
  }

  const orgName = input.name?.trim() || `${email.split('@')[0]} Collision`;
  const org = await prisma.organization.create({
    data: {
      shopId: input.shopId || undefined,
      name: orgName,
      slug: createOrganizationSlug(orgName)
    }
  });

  const user =
    existingUser ||
    (await prisma.user.create({
      data: {
        email,
        passwordHash: hashPortalPassword(input.password),
        name: input.name?.trim() || orgName,
        isActive: true
      }
    }));

  const membership = await prisma.orgMembership.create({
    data: {
      orgId: org.id,
      userId: user.id,
      role: 'owner',
      status: 'active'
    }
  });

  await prisma.location.create({
    data: {
      orgId: org.id,
      isPrimary: true,
      name: orgName
    }
  });

  await prisma.alertPreference.upsert({
    where: { orgId: org.id },
    update: {},
    create: { orgId: org.id, digestEmail: email }
  });

  setDashboardSession({
    userId: user.id,
    orgId: org.id,
    membershipRole: membership.role
  });

  return { ok: true as const, orgId: org.id, email };
}

export async function ensureUserMembershipForOrg(input: {
  orgId: string;
  email: string;
  password: string;
  name?: string;
}) {
  const email = input.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!verifyPortalPassword(input.password, user.passwordHash)) {
      return { ok: false as const, reason: 'invalid_password' as const };
    }
  } else {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPortalPassword(input.password),
        name: input.name?.trim() || email.split('@')[0],
        isActive: true
      }
    });
  }

  const membership = await prisma.orgMembership.upsert({
    where: {
      orgId_userId: {
        orgId: input.orgId,
        userId: user.id
      }
    },
    update: {
      role: 'owner',
      status: 'active'
    },
    create: {
      orgId: input.orgId,
      userId: user.id,
      role: 'owner',
      status: 'active'
    }
  });

  setDashboardSession({
    userId: user.id,
    orgId: input.orgId,
    membershipRole: membership.role
  });

  return { ok: true as const };
}

export async function loadRequestedScan(scanId?: string) {
  if (!scanId) return null;

  return prisma.scan.findUnique({
    where: { id: scanId },
    select: {
      id: true,
      shopId: true,
      organizationId: true,
      email: true,
      shopName: true,
      websiteUrl: true,
      city: true,
      moneyKeywordsJson: true,
      competitorsJson: true
    }
  }) as Promise<RequestedScan | null>;
}

export async function seedOrgFromRequestedScan(orgId: string, requestedScan: RequestedScan) {
  await seedDashboardFromScan({
    organizationId: orgId,
    scanId: requestedScan.id,
    shopName: requestedScan.shopName || '',
    websiteUrl: requestedScan.websiteUrl || '',
    city: requestedScan.city || '',
    keywords: seededKeywordsFromJson(requestedScan.moneyKeywordsJson),
    competitors: seededCompetitorsFromJson(requestedScan.competitorsJson)
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: requestedScan.shopName && requestedScan.shopName.trim().length > 0 ? requestedScan.shopName.trim() : undefined,
      city: requestedScan.city || undefined,
      websiteUrl: requestedScan.websiteUrl || undefined
    }
  });

  if (!requestedScan.shopId) return;

  try {
    await claimShopForOrganization({
      orgId,
      shopId: requestedScan.shopId,
      name: requestedScan.shopName,
      websiteUrl: requestedScan.websiteUrl,
      city: requestedScan.city
    });
  } catch (error) {
    if (error instanceof ShopClaimConflictError) {
      return { ok: false as const, conflict: true as const };
    }
    throw error;
  }

  return { ok: true as const };
}

export async function loadCheckoutOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      stripeCustomerId: true
    }
  });
  if (!org) return null;

  const subscription = await prisma.subscription.findUnique({
    where: { orgId: org.id },
    select: { status: true }
  });

  return { org, subscription };
}

export async function existingBillingPortalUrl(customerId?: string | null) {
  if (!customerId) return null;
  const portalSession = await createStripePortalSession({
    customerId,
    returnPath: '/dashboard/billing'
  });
  return portalSession.ok
    ? portalSession.url
    : '/api/stripe/create-portal-session?returnTo=/dashboard/billing';
}

export async function ensureStripeCustomer(input: {
  orgId: string;
  orgName: string | null;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripePost: (path: string, form: URLSearchParams) => Promise<StripeResponse>;
}) {
  if (input.stripeCustomerId) return input.stripeCustomerId;

  const form = new URLSearchParams();
  form.set('name', input.orgName || 'Shop SEO Scan Client');
  if (input.email) form.set('email', input.email);
  form.set('metadata[org_id]', input.orgId);
  const customer = await input.stripePost('customers', form);
  if (!customer.id) {
    return {
      error: customer.error?.message || 'Unable to create billing profile'
    };
  }

  await prisma.organization.update({
    where: { id: input.orgId },
    data: { stripeCustomerId: customer.id }
  });

  return customer.id;
}
