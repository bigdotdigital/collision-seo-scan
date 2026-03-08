import { NextResponse } from 'next/server';
import { syncSubscriptionFromEvent, type StripeWebhookEvent } from '@/lib/stripe';
import { createHmac, timingSafeEqual } from 'node:crypto';

function parseStripeSignatureHeader(header: string) {
  const out: { t?: string; v1: string[] } = { v1: [] };
  header.split(',').forEach((part) => {
    const [k, v] = part.split('=');
    if (!k || !v) return;
    const key = k.trim();
    const value = v.trim();
    if (key === 't') out.t = value;
    if (key === 'v1') out.v1.push(value);
  });
  return out;
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.t || parsed.v1.length === 0) return false;
  const signedPayload = `${parsed.t}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expectedBuf = Buffer.from(expected);
  return parsed.v1.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig);
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const event = JSON.parse(rawBody || '{}') as StripeWebhookEvent;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (webhookSecret) {
    const stripeSignature = req.headers.get('stripe-signature') || '';
    const customSecret = req.headers.get('x-stripe-webhook-secret') || '';
    const ok =
      (stripeSignature && verifyStripeSignature(rawBody, stripeSignature, webhookSecret)) ||
      customSecret === webhookSecret;
    if (!ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
