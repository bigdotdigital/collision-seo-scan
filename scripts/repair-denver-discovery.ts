import { prisma } from '../lib/prisma.ts';
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

function isBadLocationRow(args: { city: string | null; state: string | null }) {
  const city = args.city || '';
  const state = args.state || '';
  if (!city || !state) return true;
  if (/\d/.test(city)) return true;
  if (city.length <= 2) return true;
  if (state.length !== 2) return true;
  return false;
}

async function main() {
  const rows = await prisma.shop.findMany({
    where: {
      googlePlaceId: { not: null }
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true
    }
  });

  let repaired = 0;
  let skipped = 0;
  let outOfMarket = 0;

  for (const row of rows) {
    if (!isBadLocationRow({ city: row.city, state: row.state })) {
      skipped += 1;
      continue;
    }

    const parsed = parseAddressParts(row.address);
    if (!parsed.city || !parsed.state) {
      skipped += 1;
      continue;
    }

    if (!DENVER_MARKET_CITY_ALLOWLIST.has(parsed.city.toLowerCase())) {
      outOfMarket += 1;
      continue;
    }

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

  console.log(JSON.stringify({ scanned: rows.length, repaired, skipped, outOfMarket }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
