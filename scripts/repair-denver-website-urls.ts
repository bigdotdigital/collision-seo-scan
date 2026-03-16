import { prisma } from '@/lib/prisma';
import { normalizeWebsiteUrl } from '@/lib/security/url';

const CITIES = [
  'Denver',
  'Aurora',
  'Lakewood',
  'Littleton',
  'Englewood',
  'Arvada',
  'Westminster',
  'Thornton',
  'Centennial',
  'Broomfield',
  'Wheat Ridge',
  'Sheridan',
  'Glendale',
  'Greenwood Village',
  'Highlands Ranch',
  'Northglenn',
  'Commerce City',
  'Golden'
];

function repairWebsiteUrl(value: string | null | undefined) {
  const raw = (value || '').trim();
  if (!raw) return null;

  const untangleSchemeLeak = (input: string) =>
    input
      .replace(/^https?:\/\/httpswww\./i, 'https://www.')
      .replace(/^https?:\/\/httpwww\./i, 'https://www.')
      .replace(/^httpswww\./i, 'www.')
      .replace(/^httpwww\./i, 'www.');

  const untangledRaw = untangleSchemeLeak(raw);
  if (untangledRaw !== raw) {
    const normalizedUntangled = normalizeWebsiteUrl(untangledRaw);
    if (normalizedUntangled) return normalizedUntangled;
  }

  const direct = normalizeWebsiteUrl(raw);
  if (direct) return direct;

  const withoutScheme = raw.replace(/^https?:\/\//i, '');
  const untangled = withoutScheme.replace(/^(https?)(?=(www\.)?[a-z0-9-]+\.[a-z]{2,})/i, '');
  const normalized = normalizeWebsiteUrl(untangled);
  if (normalized) return normalized;

  return null;
}

async function main() {
  const shops = await prisma.shop.findMany({
    where: {
      city: { in: CITIES },
      websiteUrl: { not: null }
    },
    select: {
      id: true,
      name: true,
      city: true,
      websiteUrl: true
    }
  });

  const updates: Array<{ id: string; name: string; city: string | null; from: string; to: string }> = [];

  for (const shop of shops) {
    const repaired = repairWebsiteUrl(shop.websiteUrl);
    if (!repaired || repaired === shop.websiteUrl) continue;

    await prisma.shop.update({
      where: { id: shop.id },
      data: { websiteUrl: repaired }
    });

    updates.push({
      id: shop.id,
      name: shop.name,
      city: shop.city,
      from: shop.websiteUrl || '',
      to: repaired
    });
  }

  console.log(
    JSON.stringify(
      {
        scanned: shops.length,
        repaired: updates.length,
        updates
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
