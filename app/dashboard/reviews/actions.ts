'use server';

import { revalidatePath } from 'next/cache';
import { getAuthedClient } from '@/lib/client-auth';
import { prisma } from '@/lib/prisma';
import { parseJson, toJson } from '@/lib/json';

export async function saveManualReviews(formData: FormData) {
  const client = await getAuthedClient();
  if (!client) return;

  const rating = Number(formData.get('rating') || 0);
  const totalReviews = Number(formData.get('totalReviews') || 0);
  const newReviews30d = Number(formData.get('newReviews30d') || 0);

  const last = await prisma.metricSnapshot.findFirst({
    where: { clientId: client.id },
    orderBy: { createdAt: 'desc' }
  });

  const keywordRows = parseJson(last?.keywordsJson, []);

  await prisma.metricSnapshot.create({
    data: {
      clientId: client.id,
      keywordsJson: toJson(keywordRows),
      reviewsJson: toJson({ rating, totalReviews, newReviews30d }),
      summaryJson: toJson({
        note: 'Manual review metrics updated from dashboard input.',
        up: 0,
        down: 0
      }),
      scoreTotal: last?.scoreTotal || null
    }
  });

  revalidatePath('/dashboard/reviews');
  revalidatePath('/dashboard/reports');
}
