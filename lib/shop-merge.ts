import { prisma } from '@/lib/prisma';
import { clean, hostnameOf, normalizedState, ShopMergeConflictError } from '@/lib/shop-core';

function normalizedShopName(value?: string | null) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function findDuplicateShopCandidates(limit = 24) {
  const shops = await prisma.shop.findMany({
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      websiteUrl: true,
      googlePlaceId: true,
      updatedAt: true,
      _count: {
        select: {
          scans: true,
          organizations: true,
          trackedAsCompetitor: true
        }
      }
    }
  });

  const groups = new Map<string, typeof shops>();
  for (const shop of shops) {
    const host = hostnameOf(shop.websiteUrl);
    const placeKey = clean(shop.googlePlaceId);
    const key = placeKey ? `place:${placeKey}` : host ? `host:${host}` : null;
    if (!key) continue;
    const current = groups.get(key) || [];
    current.push(shop);
    groups.set(key, current);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length || b[0].updatedAt.getTime() - a[0].updatedAt.getTime())
    .slice(0, limit)
    .map((group) => ({
      dedupeKey:
        clean(group[0].googlePlaceId) ||
        hostnameOf(group[0].websiteUrl) ||
        `${normalizedShopName(group[0].name)}:${clean(group[0].city) || ''}:${normalizedState(group[0].state) || ''}`,
      shops: [...group].sort((a, b) => {
        const aStrength = a._count.organizations * 5 + a._count.scans * 2 + a._count.trackedAsCompetitor;
        const bStrength = b._count.organizations * 5 + b._count.scans * 2 + b._count.trackedAsCompetitor;
        return bStrength - aStrength || b.updatedAt.getTime() - a.updatedAt.getTime();
      })
    }));
}

export async function mergeShopRecords(args: {
  sourceShopId: string;
  destinationShopId: string;
}) {
  if (args.sourceShopId === args.destinationShopId) {
    throw new Error('source_and_destination_match');
  }

  const [source, destination] = await Promise.all([
    prisma.shop.findUnique({ where: { id: args.sourceShopId } }),
    prisma.shop.findUnique({ where: { id: args.destinationShopId } })
  ]);

  if (!source || !destination) {
    throw new Error('shop_not_found');
  }

  if (source.googlePlaceId && destination.googlePlaceId && source.googlePlaceId !== destination.googlePlaceId) {
    throw new ShopMergeConflictError('google_place_conflict');
  }

  const sourceHost = hostnameOf(source.websiteUrl);
  const destinationHost = hostnameOf(destination.websiteUrl);
  if (sourceHost && destinationHost && sourceHost !== destinationHost) {
    throw new ShopMergeConflictError('website_host_conflict');
  }

  return prisma.$transaction(async (tx) => {
    const [sourceSnapshot, destinationSnapshot] = await Promise.all([
      tx.shopDigitalPresenceSnapshot.findUnique({ where: { shopId: source.id } }),
      tx.shopDigitalPresenceSnapshot.findUnique({ where: { shopId: destination.id } })
    ]);

    await tx.shop.update({
      where: { id: destination.id },
      data: {
        name: destination.name || source.name,
        websiteUrl: destination.websiteUrl || source.websiteUrl,
        normalizedWebsiteHost:
          hostnameOf(destination.websiteUrl) ||
          hostnameOf(source.websiteUrl) ||
          destination.normalizedWebsiteHost ||
          source.normalizedWebsiteHost,
        phone: destination.phone || source.phone,
        address: destination.address || source.address,
        city: destination.city || source.city,
        state: destination.state || source.state,
        zip: destination.zip || source.zip,
        lat: destination.lat ?? source.lat,
        lng: destination.lng ?? source.lng,
        googlePlaceId: destination.googlePlaceId || source.googlePlaceId || undefined,
        primaryCategory: destination.primaryCategory || source.primaryCategory,
        marketId: destination.marketId || source.marketId,
        verticalDefault: destination.verticalDefault || source.verticalDefault
      }
    });

    await Promise.all([
      tx.scan.updateMany({ where: { shopId: source.id }, data: { shopId: destination.id } }),
      tx.organization.updateMany({ where: { shopId: source.id }, data: { shopId: destination.id } }),
      tx.trackedCompetitor.updateMany({ where: { shopId: source.id }, data: { shopId: destination.id } }),
      tx.shopSourceObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopKeywordObservation.updateMany({ where: { shopId: source.id }, data: { shopId: destination.id } }),
      tx.shopReviewObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopRankObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopSerpObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopConversionObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopSiteFeatureObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopInsuranceRelationshipObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id }
      }),
      tx.shopCompetitorObservation.updateMany({
        where: { sourceShopId: source.id },
        data: { sourceShopId: destination.id }
      }),
      tx.shopCompetitorObservation.updateMany({
        where: { competitorShopId: source.id },
        data: { competitorShopId: destination.id }
      }),
      tx.shopGraphEdge.updateMany({
        where: { sourceShopId: source.id },
        data: { sourceShopId: destination.id }
      }),
      tx.shopGraphEdge.updateMany({
        where: { targetShopId: source.id },
        data: { targetShopId: destination.id }
      })
    ]);

    if (sourceSnapshot && destinationSnapshot) {
      await tx.shopDigitalPresenceSnapshot.delete({ where: { shopId: source.id } });
    } else if (sourceSnapshot && !destinationSnapshot) {
      await tx.shopDigitalPresenceSnapshot.update({
        where: { shopId: source.id },
        data: { shopId: destination.id }
      });
    }

    await tx.shop.delete({
      where: { id: source.id }
    });

    return {
      merged: true,
      sourceShopId: source.id,
      destinationShopId: destination.id
    };
  });
}
