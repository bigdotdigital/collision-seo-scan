import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    await prisma.scan.update({
      where: { id: params.scanId },
      data: { bookedClicked: true }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to mark booking click' },
      { status: 400 }
    );
  }
}
