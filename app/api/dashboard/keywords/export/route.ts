import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDashboardSession } from '@/lib/client-auth';

export const dynamic = 'force-dynamic';

function toCsvCell(value: string | number | null) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET() {
  const session = await getDashboardSession();
  if (!session?.orgId) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  }

  const keywords = await prisma.trackedKeyword.findMany({
    where: { orgId: session.orgId, isActive: true },
    orderBy: { createdAt: 'asc' },
    include: {
      snapshots: {
        where: { competitorId: null },
        orderBy: { snapshotDate: 'desc' },
        take: 2
      }
    }
  });

  const header = ['keyword', 'current_rank', 'previous_rank', 'delta'];
  const rows = keywords.map((kw) => {
    const current = kw.snapshots[0]?.rankPosition ?? null;
    const previous = kw.snapshots[1]?.rankPosition ?? null;
    const delta = current !== null && previous !== null ? previous - current : null;
    return [kw.term, current, previous, delta];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => toCsvCell(cell as string | number | null)).join(','))
    .join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="keyword-rankings.csv"',
      'cache-control': 'no-store'
    }
  });
}

