import { redirect } from 'next/navigation';

export default function LegacyKeywordsPage() {
  redirect('/dashboard/rankings');
}
