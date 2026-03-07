import { prisma } from '@/lib/prisma';

type KeywordSeed = {
  keyword?: string;
};

type CompetitorSeed = {
  name?: string;
  url?: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

function uniqueStrings(input: string[]): string[] {
  return [...new Set(input.map((s) => s.trim()).filter(Boolean))];
}

export async function seedDashboardFromScan(args: {
  organizationId: string;
  shopName: string;
  websiteUrl: string;
  city: string;
  keywords: KeywordSeed[];
  competitors: CompetitorSeed[];
}) {
  const org = await prisma.organization.findUnique({
    where: { id: args.organizationId },
    select: { id: true, slug: true, name: true, city: true, state: true, zip: true }
  });

  if (!org) return { ok: false as const, reason: 'organization_not_found' as const };

  if (!org.slug) {
    const base = slugify(args.shopName || org.name || 'shop');
    const suffix = org.id.slice(-6);
    await prisma.organization.update({
      where: { id: org.id },
      data: { slug: `${base}-${suffix}` }
    });
  }

  const location = await prisma.$transaction(async (tx) => {
    const existingPrimary = await tx.location.findFirst({
      where: { orgId: org.id, isPrimary: true },
      orderBy: { createdAt: 'asc' }
    });

    if (existingPrimary) {
      return tx.location.update({
        where: { id: existingPrimary.id },
        data: {
          name: existingPrimary.name || args.shopName,
          websiteUrl: existingPrimary.websiteUrl || args.websiteUrl,
          city: existingPrimary.city || args.city
        }
      });
    }

    return tx.location.create({
      data: {
        orgId: org.id,
        isPrimary: true,
        name: args.shopName,
        websiteUrl: args.websiteUrl,
        city: args.city || org.city || undefined,
        state: org.state || undefined,
        zip: org.zip || undefined
      }
    });
  });

  const keywordTerms = uniqueStrings(
    args.keywords.map((row) => row.keyword || '').slice(0, 25)
  );

  if (keywordTerms.length > 0) {
    await prisma.trackedKeyword.createMany({
      data: keywordTerms.map((term) => ({
        orgId: org.id,
        locationId: location.id,
        term,
        source: 'scanner',
        isActive: true
      })),
      skipDuplicates: true
    });
  }

  const competitorRows = args.competitors
    .map((row) => ({
      name: (row.name || '').trim(),
      websiteUrl: (row.url || '').trim() || null
    }))
    .filter((row) => row.name)
    .slice(0, 10);

  for (const row of competitorRows) {
    const existing = await prisma.trackedCompetitor.findFirst({
      where: { orgId: org.id, locationId: location.id, name: row.name }
    });
    if (existing) continue;

    await prisma.trackedCompetitor.create({
      data: {
        orgId: org.id,
        locationId: location.id,
        name: row.name,
        websiteUrl: row.websiteUrl || undefined,
        source: 'scanner',
        isActive: true
      }
    });
  }

  await prisma.alertPreference.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      digestEmail: null
    }
  });

  return {
    ok: true as const,
    orgId: org.id,
    locationId: location.id,
    keywordsSeeded: keywordTerms.length,
    competitorsSeeded: competitorRows.length
  };
}

