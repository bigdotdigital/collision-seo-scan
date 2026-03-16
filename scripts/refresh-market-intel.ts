import { runMarketIntelRefresh } from '@/lib/jobs';

async function main() {
  const marketSlug = process.argv[2] || 'denver';
  const result = await runMarketIntelRefresh({ marketSlug });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
