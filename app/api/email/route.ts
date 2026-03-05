import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendReportEmail } from '@/lib/email';

const schema = z.object({
  to: z.string().email(),
  shopName: z.string(),
  score: z.number().int(),
  reportUrl: z.string().url()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = schema.parse(body);
    const result = await sendReportEmail(payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        sent: false,
        error: error instanceof Error ? error.message : 'Invalid email payload'
      },
      { status: 400 }
    );
  }
}
