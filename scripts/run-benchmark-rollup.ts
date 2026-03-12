import { runMarketBenchmarkRollup } from '../lib/jobs';

async function main() {
  const result = await runMarketBenchmarkRollup();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

