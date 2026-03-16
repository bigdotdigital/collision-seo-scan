import { prisma } from '../lib/prisma.ts';
import { mergeShopRecords } from '../lib/shop-merge.ts';

const DENVER_MARKET_CITIES = [
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
] as const;

function normalizeName(value: string | null | undefined) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeAddress(value: string | null | undefined) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeHost(value: string | null | undefined) {
  try {
    return new URL(value || '').hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function strength(row: {
  googlePlaceId: string | null;
  _count: { scans: number; organizations: number };
}) {
  return (row.googlePlaceId ? 20 : 0) + row._count.organizations * 5 + row._count.scans * 2;
}

async function main() {
  const shops = await prisma.shop.findMany({
    where: { city: { in: [...DENVER_MARKET_CITIES] } },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      phone: true,
      websiteUrl: true,
      googlePlaceId: true,
      _count: {
        select: {
          scans: true,
          organizations: true
        }
      }
    }
  });

  const groups = new Map<string, typeof shops>();
  for (const shop of shops) {
    const host = normalizeHost(shop.websiteUrl);
    if (!host || !shop.city) continue;
    const key = `${normalizeName(shop.name)}|${shop.city.toLowerCase()}|${host}`;
    const current = groups.get(key) || [];
    current.push(shop);
    groups.set(key, current);
  }

  let merged = 0;
  const mergedPairs: Array<{ sourceShopId: string; destinationShopId: string; name: string; city: string | null }> = [];
  const skipped: string[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const exactAddressGroups = new Map<string, typeof group>();
    for (const shop of group) {
      const key = normalizeAddress(shop.address) || '__blank__';
      const current = exactAddressGroups.get(key) || [];
      current.push(shop);
      exactAddressGroups.set(key, current);
    }

    for (const subgroup of exactAddressGroups.values()) {
      if (subgroup.length < 2) continue;
      const ordered = [...subgroup].sort((a, b) => strength(b) - strength(a));
      const destination = ordered[0];

      for (const source of ordered.slice(1)) {
        const samePhone =
          !destination.phone || !source.phone || destination.phone.replace(/\D/g, '') === source.phone.replace(/\D/g, '');
        const safeAddress =
          normalizeAddress(destination.address) === normalizeAddress(source.address) ||
          (!destination.address && !source.address);

        if (!samePhone || !safeAddress) {
          skipped.push(`${destination.id}:${source.id}`);
          continue;
        }

        await mergeShopRecords({
          sourceShopId: source.id,
          destinationShopId: destination.id
        });
        merged += 1;
        mergedPairs.push({
          sourceShopId: source.id,
          destinationShopId: destination.id,
          name: source.name,
          city: source.city
        });
      }
    }
  }

  console.log(JSON.stringify({ merged, mergedPairs, skipped: skipped.slice(0, 20) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
