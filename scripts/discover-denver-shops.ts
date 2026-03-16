import { discoverDenverMetroShops } from '../lib/market-discovery.ts';

async function main() {
  const result = await discoverDenverMetroShops();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
