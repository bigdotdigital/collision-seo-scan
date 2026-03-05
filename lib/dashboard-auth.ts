import { redirect } from 'next/navigation';
import { getAuthedClient } from '@/lib/client-auth';

export async function requireDashboardClient() {
  const client = await getAuthedClient();
  if (!client || !client.isActive) {
    redirect('/login');
  }
  return client;
}
