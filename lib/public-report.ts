import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/json';
import { parseReportPayload } from '@/lib/report-payload';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function publicMarketSlug(value?: string | null) {
  return slugify(value || '');
}

export async function ensureShopPublicSlug(args: {
  shopId: string;
  shopName: string;
  city?: string | null;
  state?: string | null;
}) {
  const shop = await prisma.shop.findUnique({
    where: { id: args.shopId },
    select: { publicProfileSlug: true }
  });
  if (shop?.publicProfileSlug) return shop.publicProfileSlug;

  const base = [args.shopName, args.city, args.state].filter(Boolean).join(' ');
  const root = slugify(base) || `shop-${args.shopId.slice(0, 8)}`;

  let slug = root;
  let attempt = 0;
  while (attempt < 5) {
    const conflict = await prisma.shop.findFirst({
      where: {
        publicProfileSlug: slug,
        id: { not: args.shopId }
      },
      select: { id: true }
    });
    if (!conflict) break;
    attempt += 1;
    slug = `${root}-${args.shopId.slice(0, 6 + attempt)}`;
  }

  await prisma.shop.update({
    where: { id: args.shopId },
    data: { publicProfileSlug: slug }
  });

  return slug;
}

function publicFindings(reportPayload: ReturnType<typeof parseReportPayload>) {
  if (!reportPayload) return [];

  return (reportPayload.topFixes || [])
    .slice(0, 3)
    .map((fix) => ({
      title: fix.title,
      why: fix.why
    }));
}

export function buildPublicSummary(rawChecksJson: string) {
  const payload = parseReportPayload(parseJson(rawChecksJson, null));
  const findings = publicFindings(payload);
  const measuredSignals = [
    payload?.checks?.estimateCtaDetected ? 'Estimate CTA detected' : null,
    payload?.checks?.reviewProofPresent ? 'Review proof detected' : null,
    payload?.checks?.mapEmbedDetected ? 'Map embed detected' : null,
    payload?.checks?.locationFinderPresent ? 'Location finder detected' : null
  ].filter(Boolean) as string[];

  return {
    findings,
    measuredSignals,
    teaser:
      findings.length > 0
        ? 'Deeper keyword, competitor, maps, and repair-plan analysis is available after profile claim.'
        : 'Additional keyword, maps, and competitor analysis is reserved for the claimed dashboard.'
  };
}

export function publicQualityThreshold(args: {
  scoreTotal: number;
  findingsCount: number;
  hasWebsiteUrl: boolean;
  city?: string | null;
}) {
  return args.scoreTotal > 0 && args.findingsCount >= 2 && args.hasWebsiteUrl && Boolean(args.city);
}

export async function publishScanIfQualified(args: {
  scanId: string;
  shopId: string;
  shopName: string;
  city?: string | null;
  state?: string | null;
  websiteUrl?: string | null;
  scoreTotal: number;
  rawChecksJson: string;
}) {
  const shop = await prisma.shop.findUnique({
    where: { id: args.shopId },
    select: { publicProfileOptOutAt: true }
  });
  const summary = buildPublicSummary(args.rawChecksJson);
  const quality = publicQualityThreshold({
    scoreTotal: args.scoreTotal,
    findingsCount: summary.findings.length,
    hasWebsiteUrl: Boolean(args.websiteUrl),
    city: args.city
  });

  await ensureShopPublicSlug({
    shopId: args.shopId,
    shopName: args.shopName,
    city: args.city,
    state: args.state
  });

  const publicStatus = shop?.publicProfileOptOutAt ? 'opted_out' : quality ? 'published' : 'private';

  return prisma.scan.update({
    where: { id: args.scanId },
    data: {
      publicStatus,
      publicPublishedAt: publicStatus === 'published' ? new Date() : null,
      publicSummaryJson: JSON.stringify(summary)
    }
  });
}

export async function loadPublicShopReport(args: {
  state: string;
  city: string;
  shopSlug: string;
}) {
  const state = publicMarketSlug(args.state);
  const city = publicMarketSlug(args.city);

  const shop = await prisma.shop.findFirst({
    where: {
      publicProfileSlug: args.shopSlug,
      publicProfileOptOutAt: null
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      websiteUrl: true,
      publicProfileSlug: true,
      scans: {
        where: {
          publicStatus: 'published',
          executionStatus: 'completed'
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          createdAt: true,
          scoreTotal: true,
          rawChecksJson: true,
          publicSummaryJson: true
        }
      }
    }
  });

  if (!shop || publicMarketSlug(shop.city) !== city || publicMarketSlug(shop.state) !== state) {
    return null;
  }

  const scan = shop.scans[0];
  if (!scan) return null;

  const summary = parseJson<{
    findings?: Array<{ title: string; why: string }>;
    measuredSignals?: string[];
    teaser?: string;
  }>(scan.publicSummaryJson, {});

  return {
    shop,
    scan,
    summary,
    isThin: !publicQualityThreshold({
      scoreTotal: scan.scoreTotal,
      findingsCount: summary.findings?.length || 0,
      hasWebsiteUrl: Boolean(shop.websiteUrl),
      city: shop.city
    })
  };
}
