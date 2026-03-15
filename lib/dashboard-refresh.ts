import { createScanRecord } from '@/lib/org-data';
import { enqueueScanExecution } from '@/lib/scan-queue';

export async function refreshOrganizationScan(args: {
  orgId: string;
  shopId?: string | null;
  shopName: string;
  websiteUrl: string;
  city: string;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  vertical?: string | null;
}) {
  const scan = await createScanRecord(
    {
      website_url: args.websiteUrl,
      city_or_zip: args.city,
      shop_name: args.shopName,
      phone: args.phone || '',
      vertical: args.vertical || 'collision',
      executionStatus: 'queued',
      queuedAt: new Date()
    },
    args.orgId,
    args.shopId || undefined
  );

  await enqueueScanExecution({
    scanId: scan.id,
    payload: {
      source: 'dashboard_refresh',
      refreshedFromDashboard: true
    }
  });

  return {
    scanId: scan.id,
    source: 'queued'
  };
}
