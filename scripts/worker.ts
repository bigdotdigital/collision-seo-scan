import { prisma } from '../lib/prisma.ts';
import { runQueueWorkerLoop } from '../lib/queue/worker.ts';

async function main() {
  await runQueueWorkerLoop();
}

main()
  .catch((error) => {
    console.error('[worker:fatal]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
