import { NextResponse } from 'next/server';
import { syncSubscriptionFromEvent, type StripeWebhookEvent } from '@/lib/stripe';

function authorized(req: Request) {
  const expected = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!expected) return true;
  const header = req.headers.get('x-stripe-webhook-secret') || '';
  return header === expected;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const event = (await req.json().catch(() => null)) as StripeWebhookEvent | null;
  if (!event?.type) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const supported = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed'
  ];

  if (!supported.includes(event.type)) {
    return NextResponse.json({ ok: true, ignored: true, type: event.type });
  }

  const result = await syncSubscriptionFromEvent(event);
  return NextResponse.json({ ok: true, type: event.type, result });
}

