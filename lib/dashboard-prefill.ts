import { prisma } from '@/lib/prisma';
import { isLikelyNonShopCompetitor } from '@/lib/competitor-filter';
import { deriveCompetitorSuggestions, deriveKeywordSuggestions } from '@/lib/dashboard-suggestions';
import { resolveCompetitorShop } from '@/lib/shop-data';

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
  scanId?: string;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: args.organizationId },
    select: { id: true, slug: true, name: true, city: true, state: true, zip: true, verticalDefault: true }
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

  const latestScan = args.scanId
    ? await prisma.scan.findUnique({
        where: { id: args.scanId },
        select: {
          shopName: true,
          city: true,
          websiteUrl: true,
          moneyKeywordsJson: true,
          competitorsJson: true,
          rawChecksJson: true
        }
      })
    : await prisma.scan.findFirst({
        where: {
          organizationId: org.id
        },
        orderBy: { createdAt: 'desc' },
        select: {
          shopName: true,
          city: true,
          websiteUrl: true,
          moneyKeywordsJson: true,
          competitorsJson: true,
          rawChecksJson: true
        }
      });

  const explicitKeywordTerms = uniqueStrings(args.keywords.map((row) => row.keyword || '').slice(0, 25));
  const keywordSuggestions = await deriveKeywordSuggestions({
    shopName: latestScan?.shopName || args.shopName || org.name,
    city: latestScan?.city || args.city || org.city || '',
    websiteUrl: latestScan?.websiteUrl || args.websiteUrl,
    moneyKeywordsJson: latestScan?.moneyKeywordsJson || null,
    competitorsJson: latestScan?.competitorsJson || null,
    rawChecksJson: latestScan?.rawChecksJson || null,
    allowAi: explicitKeywordTerms.length < 3
  });
  const keywordTerms = uniqueStrings([
    ...explicitKeywordTerms,
    ...keywordSuggestions.map((row) => row.term)
  ]).slice(0, 25);

  if (keywordTerms.length > 0) {
    await prisma.trackedKeyword.createMany({
      data: keywordTerms.map((term) => ({
        orgId: org.id,
        locationId: location.id,
        term,
        source: explicitKeywordTerms.includes(term)
          ? 'scanner'
          : keywordSuggestions.find((row) => row.term === term)?.note.includes('AI-assisted')
            ? 'ai_suggested'
            : 'scan_suggested',
        isActive: true
      })),
      skipDuplicates: true
    });
  }

  const explicitCompetitors = args.competitors
    .map((row) => ({
      name: (row.name || '').trim(),
      websiteUrl: (row.url || '').trim() || null
    }))
    .filter((row) => row.name && !isLikelyNonShopCompetitor(row.name, row.websiteUrl))
    .slice(0, 10);
  const competitorSuggestions = deriveCompetitorSuggestions({
    shopName: latestScan?.shopName || args.shopName || org.name,
    city: latestScan?.city || args.city || org.city || '',
    websiteUrl: latestScan?.websiteUrl || args.websiteUrl,
    competitorsJson: latestScan?.competitorsJson || null,
    rawChecksJson: latestScan?.rawChecksJson || null
  });
  const competitorRows = [...explicitCompetitors];
  for (const suggestion of competitorSuggestions) {
    if (competitorRows.some((row) => row.name.toLowerCase() === suggestion.name.toLowerCase())) continue;
    competitorRows.push({
      name: suggestion.name,
      websiteUrl: suggestion.websiteUrl
    });
    if (competitorRows.length >= 10) break;
  }

  for (const row of competitorRows) {
    const existing = await prisma.trackedCompetitor.findFirst({
      where: { orgId: org.id, locationId: location.id, name: row.name }
    });
    const competitorShop = await resolveCompetitorShop({
      name: row.name,
      websiteUrl: row.websiteUrl,
      city: location.city || org.city || args.city || null,
      state: location.state || org.state || null,
      vertical: org.verticalDefault || 'collision'
    });
    if (existing) {
      await prisma.trackedCompetitor.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          websiteUrl: row.websiteUrl || existing.websiteUrl,
          shopId: competitorShop.id,
          source: existing.source || 'scanner'
        }
      });
      continue;
    }

    await prisma.trackedCompetitor.create({
      data: {
        orgId: org.id,
        locationId: location.id,
        shopId: competitorShop.id,
        name: row.name,
        websiteUrl: row.websiteUrl || undefined,
        source: explicitCompetitors.some((candidate) => candidate.name.toLowerCase() === row.name.toLowerCase())
          ? 'scanner'
          : 'scan_suggested',
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
