import 'dotenv/config';
import { createRequire } from 'node:module';
import type Queue from 'bull';

const loadModule = createRequire(__filename);
const QueueConstructor = loadModule('bull') as typeof Queue;

const QUEUE_NAME = 'compatibility-calculation';
const CONFIRM = process.argv.includes('--confirm');

type CleanableStatus = 'completed' | 'failed' | 'delayed' | 'wait' | 'paused';

function parsePort(value: string | undefined): number {
  const parsed = Number.parseInt(value || '6379', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 6379;
}

function createQueue(): Queue.Queue {
  if (process.env.REDIS_URL) {
    return new QueueConstructor(QUEUE_NAME, process.env.REDIS_URL);
  }

  return new QueueConstructor(QUEUE_NAME, {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parsePort(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number.parseInt(process.env.REDIS_DB || '0', 10),
    },
  });
}

async function main(): Promise<void> {
  const queue = createQueue();

  try {
    const counts = await queue.getJobCounts();

    if (!CONFIRM) {
      console.log(
        JSON.stringify(
          {
            queue: QUEUE_NAME,
            dryRun: true,
            counts,
            nextStep:
              'Run with --confirm during a maintenance window to remove legacy queued compatibility jobs.',
          },
          null,
          2,
        ),
      );
      return;
    }

    const statuses: CleanableStatus[] = [
      'completed',
      'failed',
      'delayed',
      'wait',
      'paused',
    ];
    const cleaned: Record<CleanableStatus, number> = {
      completed: 0,
      failed: 0,
      delayed: 0,
      wait: 0,
      paused: 0,
    };

    for (const status of statuses) {
      const jobs = await queue.clean(0, status);
      cleaned[status] = jobs.length;
    }

    console.log(
      JSON.stringify(
        {
          queue: QUEUE_NAME,
          dryRun: false,
          before: counts,
          cleaned,
        },
        null,
        2,
      ),
    );
  } finally {
    await queue.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Compatibility queue cleanup failed: ${message}`);
  process.exit(1);
});
