import { VerticalLandingPage } from '@/components/vertical-landing-page';

export default function CollisionPage({
  searchParams,
}: {
  searchParams?: {
    pendingScanId?: string;
    websiteUrl?: string;
    city?: string;
    shopName?: string;
  };
}) {
  const pendingScan =
    searchParams?.pendingScanId
      ? {
          scanId: searchParams.pendingScanId,
          websiteUrl: searchParams.websiteUrl || '',
          city: searchParams.city || '',
          shopName: searchParams.shopName || '',
        }
      : null;

  return <VerticalLandingPage vertical="collision" pendingScan={pendingScan} />;
}
