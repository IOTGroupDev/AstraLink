import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type UserBirthRow = {
  id: string;
  created_at: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_date_encrypted: string | null;
  birth_time_encrypted: string | null;
  birth_place_encrypted: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE_SIZE = Number.parseInt(
  process.env.BIRTH_DATA_CLEANUP_PAGE_SIZE || '500',
  10,
);
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for cleanup.',
  );
  process.exit(1);
}

if (!Number.isInteger(PAGE_SIZE) || PAGE_SIZE <= 0) {
  console.error('BIRTH_DATA_CLEANUP_PAGE_SIZE must be a positive integer.');
  process.exit(1);
}

if (process.env.BIRTH_DATA_WRITE_PLAINTEXT === 'true' && !FORCE) {
  console.error(
    'BIRTH_DATA_WRITE_PLAINTEXT must not be true before cleanup. Use --force only if you know what you are doing.',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function hasPlainBirthData(row: UserBirthRow): boolean {
  return Boolean(row.birth_date || row.birth_time || row.birth_place);
}

function hasEncryptedBirthData(row: UserBirthRow): boolean {
  return Boolean(
    row.birth_date_encrypted &&
      row.birth_time_encrypted &&
      row.birth_place_encrypted,
  );
}

function canClearPlaintext(row: UserBirthRow): boolean {
  return hasPlainBirthData(row) && hasEncryptedBirthData(row);
}

async function fetchPage(from: number, to: number): Promise<UserBirthRow[]> {
  const { data, error } = await admin
    .from('users')
    .select(
      'id, created_at, birth_date, birth_time, birth_place, birth_date_encrypted, birth_time_encrypted, birth_place_encrypted',
    )
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch users for cleanup: ${error.message}`);
  }

  return (data ?? []) as UserBirthRow[];
}

async function main(): Promise<void> {
  let processed = 0;
  let cleared = 0;
  let blocked = 0;
  let skipped = 0;
  let from = 0;

  while (true) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    if (page.length === 0) {
      break;
    }

    for (const row of page) {
      processed += 1;

      if (!hasPlainBirthData(row)) {
        skipped += 1;
        continue;
      }

      if (!canClearPlaintext(row)) {
        blocked += 1;
        continue;
      }

      if (DRY_RUN) {
        cleared += 1;
        continue;
      }

      const { error } = await admin
        .from('users')
        .update({
          birth_date: null,
          birth_time: null,
          birth_place: null,
        })
        .eq('id', row.id);

      if (error) {
        throw new Error(
          `Failed to clear plaintext birth fields for user ${row.id}: ${error.message}`,
        );
      }

      cleared += 1;
    }

    from += page.length;
  }

  console.log(
    JSON.stringify(
      {
        processed,
        cleared,
        blocked,
        skipped,
        dryRun: DRY_RUN,
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Birth field plaintext cleanup failed: ${message}`);
  process.exit(1);
});
