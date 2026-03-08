import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDashboardSession } from '@/lib/client-auth';
import { createStripePortalSession } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getDashboardSession();
  if (!session?.orgId) {
    const loginUrl = new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    return NextResponse.redirect(loginUrl);
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { stripeCustomerId: true }
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.redirect(
      new URL('/dashboard/billing?portal=missing-customer', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
    );
  }

  const urlObj = new URL(req.url);
  const returnTo = urlObj.searchParams.get('returnTo') || '/dashboard/billing';
  const sessionResult = await createStripePortalSession({
    customerId: org.stripeCustomerId,
    returnPath: returnTo
  });

  if (!sessionResult.ok) {
    return NextResponse.redirect(
      new URL('/dashboard/billing?portal=error', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
    );
  }

  return NextResponse.redirect(sessionResult.url);
}
