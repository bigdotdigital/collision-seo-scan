import { randomBytes, scryptSync } from 'node:crypto';
import { prisma } from '../lib/prisma.ts';

type BetaSeed = {
  key: '5280' | 'ace' | 'werkheiser';
  shopName: string;
  cityHint: string;
  websiteHint?: string;
  envEmailKey: string;
  envPasswordKey: string;
};

const LIFETIME_END = new Date('2099-12-31T23:59:59.000Z');

const BETA_SHOPS: BetaSeed[] = [
  {
    key: '5280',
    shopName: '5280 Auto Hail Repair and Collision Center',
    cityHint: 'Denver',
    websiteHint: '5280autohail.com',
    envEmailKey: 'BETA_EMAIL_5280',
    envPasswordKey: 'BETA_PASSWORD_5280'
  },
  {
    key: 'ace',
    shopName: 'Ace Auto Hail Repair',
    cityHint: 'Denver',
    websiteHint: 'aceautohailrepair.com',
    envEmailKey: 'BETA_EMAIL_ACE',
    envPasswordKey: 'BETA_PASSWORD_ACE'
  },
  {
    key: 'werkheiser',
    shopName: 'Werkheiser Collision',
    cityHint: 'Denver',
    websiteHint: 'werkheisercollision.com',
    envEmailKey: 'BETA_EMAIL_WERKHEISER',
    envPasswordKey: 'BETA_PASSWORD_WERKHEISER'
  }
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function generatePassword() {
  return `Beta-${randomBytes(5).toString('hex')}`;
}

function hashPortalPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
}

async function findBestEmail(shop: BetaSeed): Promise<string | null> {
  const explicit = process.env[shop.envEmailKey]?.trim().toLowerCase();
  if (explicit) return explicit;

  const fromClient = await prisma.client.findFirst({
    where: {
      OR: [
        { shopName: { contains: shop.shopName, mode: 'insensitive' } },
        shop.websiteHint ? { websiteUrl: { contains: shop.websiteHint, mode: 'insensitive' } } : undefined
      ].filter(Boolean) as any
    },
    orderBy: { createdAt: 'desc' },
    select: { ownerEmail: true }
  });
  if (fromClient?.ownerEmail) return fromClient.ownerEmail.toLowerCase();

  const fromScan = await prisma.scan.findFirst({
    where: {
      OR: [
        { shopName: { contains: shop.shopName, mode: 'insensitive' } },
        shop.websiteHint ? { websiteUrl: { contains: shop.websiteHint, mode: 'insensitive' } } : undefined
      ].filter(Boolean) as any,
      email: { not: null }
    },
    orderBy: { createdAt: 'desc' },
    select: { email: true }
  });
  if (fromScan?.email) return fromScan.email.toLowerCase();

  return null;
}

async function findOrCreateOrg(shop: BetaSeed) {
  const existing = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: shop.shopName, mode: 'insensitive' } },
        shop.websiteHint ? { websiteUrl: { contains: shop.websiteHint, mode: 'insensitive' } } : undefined
      ].filter(Boolean) as any
    },
    orderBy: { createdAt: 'asc' }
  });
  if (existing) return existing;

  let baseSlug = slugify(shop.shopName) || `shop-${shop.key}`;
  let slug = baseSlug;
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${baseSlug}-${i}`;
  }

  return prisma.organization.create({
    data: {
      name: shop.shopName,
      slug,
      city: shop.cityHint,
      state: 'CO',
      websiteUrl: shop.websiteHint ? `https://${shop.websiteHint}` : null,
      planTier: 'monitor'
    }
  });
}

async function ensurePrimaryLocation(orgId: string, shopName: string, city: string) {
  const existing = await prisma.location.findFirst({
    where: { orgId, isPrimary: true },
    orderBy: { createdAt: 'asc' }
  });
  if (existing) return existing;
  return prisma.location.create({
    data: {
      orgId,
      isPrimary: true,
      name: shopName,
      city,
      state: 'CO'
    }
  });
}

async function main() {
  const usedEmails = new Set<string>();
  const report: Array<{
    shop: string;
    email: string;
    password: string;
    orgId: string;
    note?: string;
  }> = [];

  for (const shop of BETA_SHOPS) {
    const org = await findOrCreateOrg(shop);
    await ensurePrimaryLocation(org.id, org.name, org.city || shop.cityHint);

    const discoveredEmail = await findBestEmail(shop);
    let resolvedEmail = discoveredEmail || `beta+${slugify(shop.key)}@shopseoscan.local`;
    if (usedEmails.has(resolvedEmail)) {
      resolvedEmail = `beta+${slugify(shop.key)}@shopseoscan.local`;
    }
    usedEmails.add(resolvedEmail);
    const forcedPassword = process.env[shop.envPasswordKey]?.trim();
    const password = forcedPassword || process.env.BETA_TESTER_PASSWORD || generatePassword();

    const user = await prisma.user.upsert({
      where: { email: resolvedEmail },
      update: {
        isActive: true,
        name: org.name,
        passwordHash: hashPortalPassword(password)
      },
      create: {
        email: resolvedEmail,
        name: org.name,
        passwordHash: hashPortalPassword(password),
        isActive: true
      }
    });

    await prisma.orgMembership.upsert({
      where: {
        orgId_userId: {
          orgId: org.id,
          userId: user.id
        }
      },
      update: { role: 'owner', status: 'active' },
      create: {
        orgId: org.id,
        userId: user.id,
        role: 'owner',
        status: 'active'
      }
    });

    await prisma.alertPreference.upsert({
      where: { orgId: org.id },
      update: { digestEmail: resolvedEmail },
      create: { orgId: org.id, digestEmail: resolvedEmail }
    });

    await prisma.subscription.upsert({
      where: { orgId: org.id },
      update: {
        planTier: 'monitor',
        status: 'active',
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: LIFETIME_END,
        cancelAtPeriodEnd: false
      },
      create: {
        orgId: org.id,
        planTier: 'monitor',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: LIFETIME_END,
        cancelAtPeriodEnd: false
      }
    });

    await prisma.organization.update({
      where: { id: org.id },
      data: { agencyManaged: true, planTier: 'monitor' }
    });

    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { ownerEmail: resolvedEmail },
          { shopName: { contains: org.name, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    if (existingClient) {
      await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          shopName: org.name,
          city: org.city || shop.cityHint,
          websiteUrl: org.websiteUrl || existingClient.websiteUrl,
          ownerEmail: resolvedEmail,
          plan: 'beta_lifetime',
          isActive: true,
          portalPasswordHash: hashPortalPassword(password)
        }
      });
    } else {
      await prisma.client.create({
        data: {
          shopName: org.name,
          city: org.city || shop.cityHint,
          websiteUrl: org.websiteUrl || `https://${shop.websiteHint || `${shop.key}.com`}`,
          ownerEmail: resolvedEmail,
          plan: 'beta_lifetime',
          isActive: true,
          portalPasswordHash: hashPortalPassword(password)
        }
      });
    }

    report.push({
      shop: org.name,
      email: resolvedEmail,
      password,
      orgId: org.id,
      note: resolvedEmail.endsWith('@shopseoscan.local')
        ? 'Using beta placeholder email. Set BETA_EMAIL_* env vars and re-run to use real client email.'
        : undefined
    });
  }

  console.log('\n✅ Beta tester accounts ready:\n');
  for (const row of report) {
    console.log(`- ${row.shop}`);
    console.log(`  email: ${row.email}`);
    console.log(`  password: ${row.password}`);
    console.log(`  orgId: ${row.orgId}`);
    if (row.note) console.log(`  note: ${row.note}`);
  }
  console.log('\nLogin URL: /login');
}

main()
  .catch((error) => {
    console.error('seed-beta-testers failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
