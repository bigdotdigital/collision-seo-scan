import { prepareScan, savePreparedScan } from '@/lib/scan-workflow';

export async function refreshOrganizationScan(args: {
  orgId: string;
  shopName: string;
  websiteUrl: string;
  city: string;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  vertical?: string | null;
}) {
  const prepared = await prepareScan({
    shopName: args.shopName,
    websiteUrl: args.websiteUrl,
    city: args.city,
    state: args.state || null,
    address: args.address || null,
    phone: args.phone || null,
    vertical: args.vertical || 'collision'
  });

  const saved = await savePreparedScan({
    orgId: args.orgId,
    shopName: args.shopName,
    city: args.city,
    state: args.state || null,
    address: args.address || null,
    phone: args.phone || null,
    vertical: prepared.vertical,
    prepared,
    conversionSource: 'dashboard_refresh',
    conversionValue: {
      scoreTotal: prepared.result.scores.total,
      refreshedFromDashboard: true
    }
  });

  return {
    scanId: saved.scan.id,
    googlePlace: saved.googlePlace,
    source: prepared.googlePlaceResult.source
  };
}
