import { prisma } from '../lib/prisma.ts';
import { mergeShopRecords, findDuplicateShopCandidates } from '../lib/shop-merge.ts';
import { upsertMarketFromInput } from '../lib/shop-core.ts';

const DENVER_MARKET_CITY_ALLOWLIST = new Set(
  [
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
  ].map((value) => value.toLowerCase())
);

function parseAddressParts(address: string | null) {
  if (!address) return { city: null, state: null, zip: null };
  const parts = address.split(',').map((part) => part.trim());
  const city = parts.length >= 3 ? parts[1] || null : null;
  const stateZip = parts.length >= 3 ? parts[2] || '' : parts.length >= 2 ? parts[1] || '' : '';
  const state = stateZip ? stateZip.split(/\s+/)[0] || null : null;
  const zip = stateZip ? stateZip.split(/\s+/).slice(1).join(' ') || null : null;
  return { city, state, zip };
}

function invalidState(value: string | null) {
  return !value || value.trim().length !== 2;
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function repairLocations() {
  const rows = await prisma.shop.findMany({
    where: {
      OR: [
        { city: null },
        { state: null },
        { state: { notIn: ['CO'] } }
      ]
    },
    select: {
      id: true,
      address: true,
      city: true,
      state: true
    }
  });

  let repaired = 0;
  for (const row of rows) {
    if (!row.address) continue;
    const parsed = parseAddressParts(row.address);
    if (!parsed.city || !parsed.state) continue;
    if (!DENVER_MARKET_CITY_ALLOWLIST.has(parsed.city.toLowerCase())) continue;
    if (!invalidState(row.state) && row.city && !/\d/.test(row.city)) continue;

    const market = await upsertMarketFromInput({
      city: parsed.city,
      state: parsed.state,
      vertical: 'collision'
    });

    await prisma.shop.update({
      where: { id: row.id },
      data: {
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip || undefined,
        marketId: market?.id || undefined
      }
    });
    repaired += 1;
  }

  return repaired;
}

async function mergeSafeDuplicates() {
  const groups = await findDuplicateShopCandidates(100);
  let merged = 0;
  const skipped: string[] = [];

  for (const group of groups) {
    const shops = group.shops.filter((shop) => DENVER_MARKET_CITY_ALLOWLIST.has((shop.city || '').toLowerCase()));
    if (shops.length < 2) continue;

    const [destination, ...candidates] = shops;
    for (const source of candidates) {
      const sameCity = (source.city || '').toLowerCase() === (destination.city || '').toLowerCase();
      const sameName = normalizedName(source.name) === normalizedName(destination.name);
      const exactWebsite = (source.websiteUrl || '').replace(/\/$/, '') === (destination.websiteUrl || '').replace(/\/$/, '');
      const weakSource = source._count.scans === 0 && source._count.organizations === 0;
      const strongerDestination =
        destination._count.scans >= source._count.scans &&
        destination._count.organizations >= source._count.organizations;

      if ((sameCity && sameName && exactWebsite && strongerDestination) || (sameCity && sameName && weakSource && strongerDestination)) {
        await mergeShopRecords({ sourceShopId: source.id, destinationShopId: destination.id });
        merged += 1;
      } else {
        skipped.push(`${group.dedupeKey}:${source.id}`);
      }
    }
  }

  return { merged, skipped: skipped.slice(0, 20) };
}

async function main() {
  const repairedLocations = await repairLocations();
  const mergeResult = await mergeSafeDuplicates();

  console.log(
    JSON.stringify(
      {
        repairedLocations,
        mergedDuplicates: mergeResult.merged,
        skippedDuplicateCandidates: mergeResult.skipped
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
