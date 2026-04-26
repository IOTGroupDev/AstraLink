import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SensitiveProfileEncryptionService } from '@/common/services/sensitive-profile-encryption.service';

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

type BirthBackfillPayload = Pick<
  UserBirthRow,
  'birth_date' | 'birth_time' | 'birth_place'
> &
  Partial<
    Pick<
      UserBirthRow,
      'birth_date_encrypted' | 'birth_time_encrypted' | 'birth_place_encrypted'
    >
  >;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE_SIZE = Number.parseInt(
  process.env.BIRTH_ENCRYPTION_BACKFILL_PAGE_SIZE || '500',
  10,
);
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for backfill.',
  );
  process.exit(1);
}

if (!Number.isInteger(PAGE_SIZE) || PAGE_SIZE <= 0) {
  console.error(
    'BIRTH_ENCRYPTION_BACKFILL_PAGE_SIZE must be a positive integer.',
  );
  process.exit(1);
}

const encryption = new SensitiveProfileEncryptionService();

if (!encryption.isConfigured()) {
  console.error(
    'DATA_ENCRYPTION_KEY is required for birth field backfill. Aborting.',
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

function needsBackfill(row: UserBirthRow): boolean {
  return (
    hasPlainBirthData(row) &&
    (!row.birth_date_encrypted ||
      !row.birth_time_encrypted ||
      !row.birth_place_encrypted)
  );
}

function buildEncryptedUpdate(
  row: UserBirthRow,
): Record<string, string | null> {
  const encrypted = encryption.prepareBirthDataForStorage<BirthBackfillPayload>(
    {
      birth_date: row.birth_date,
      birth_time: row.birth_time,
      birth_place: row.birth_place,
    },
  );

  const updatePayload: Record<string, string | null> = {};

  if (!row.birth_date_encrypted && row.birth_date) {
    updatePayload.birth_date_encrypted = encrypted.birth_date_encrypted ?? null;
  }

  if (!row.birth_time_encrypted && row.birth_time) {
    updatePayload.birth_time_encrypted = encrypted.birth_time_encrypted ?? null;
  }

  if (!row.birth_place_encrypted && row.birth_place) {
    updatePayload.birth_place_encrypted =
      encrypted.birth_place_encrypted ?? null;
  }

  return updatePayload;
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
    throw new Error(`Failed to fetch users for backfill: ${error.message}`);
  }

  return (data ?? []) as UserBirthRow[];
}

async function main(): Promise<void> {
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let from = 0;

  while (true) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    if (page.length === 0) {
      break;
    }

    for (const row of page) {
      processed += 1;

      if (!needsBackfill(row)) {
        skipped += 1;
        continue;
      }

      const updatePayload = buildEncryptedUpdate(row);
      if (Object.keys(updatePayload).length === 0) {
        skipped += 1;
        continue;
      }

      if (DRY_RUN) {
        updated += 1;
        continue;
      }

      const { error } = await admin
        .from('users')
        .update(updatePayload)
        .eq('id', row.id);

      if (error) {
        throw new Error(
          `Failed to update encrypted birth fields for user ${row.id}: ${error.message}`,
        );
      }

      updated += 1;
    }

    from += page.length;
  }

  console.log(
    JSON.stringify(
      {
        processed,
        updated,
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
  console.error(`Birth field encryption backfill failed: ${message}`);
  process.exit(1);
});
