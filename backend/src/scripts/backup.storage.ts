import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

type StorageBucketRow = {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
};

type StorageObjectRow = {
  bucket_id: string;
  name: string;
  id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  last_accessed_at: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_DIR =
  process.env.STORAGE_BACKUP_DIR || process.argv[2] || './storage-backup';
const BUCKETS_RAW =
  process.env.STORAGE_BUCKETS || process.argv[3] || 'user-photos,chat-media';

const BUCKETS = BUCKETS_RAW.split(/[,\s]+/)
  .map((value) => value.trim())
  .filter(Boolean);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for storage backup.',
  );
  process.exit(1);
}

if (BUCKETS.length === 0) {
  console.error('No storage buckets were provided for backup.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizeObjectPath(objectName: string): string {
  const normalized = path.posix.normalize(objectName).replace(/^\/+/, '');

  if (
    !normalized ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new Error(`Unsafe storage object path: ${objectName}`);
  }

  return normalized;
}

async function fetchBucketMetadata(): Promise<StorageBucketRow[]> {
  const { data, error } = await admin
    .schema('storage')
    .from('buckets')
    .select('id, name, public, file_size_limit, allowed_mime_types')
    .in('id', BUCKETS)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch storage bucket metadata: ${error.message}`,
    );
  }

  return (data ?? []) as StorageBucketRow[];
}

async function fetchObjects(bucket: string): Promise<StorageObjectRow[]> {
  const objects: StorageObjectRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await admin
      .schema('storage')
      .from('objects')
      .select(
        'bucket_id, name, id, metadata, created_at, updated_at, last_accessed_at',
      )
      .eq('bucket_id', bucket)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(
        `Failed to list storage objects for bucket ${bucket}: ${error.message}`,
      );
    }

    const page = (data ?? []) as StorageObjectRow[];
    objects.push(...page);

    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return objects;
}

async function downloadObject(
  bucket: string,
  objectName: string,
  bucketDir: string,
): Promise<void> {
  const safePath = normalizeObjectPath(objectName);
  const targetPath = path.join(bucketDir, safePath);
  const targetDir = path.dirname(targetPath);

  await mkdir(targetDir, { recursive: true });

  const { data, error } = await admin.storage.from(bucket).download(objectName);
  if (error || !data) {
    throw new Error(
      `Failed to download ${bucket}/${objectName}: ${error?.message ?? 'empty response'}`,
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  await writeFile(targetPath, buffer);
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const bucketMetadata = await fetchBucketMetadata();
  await writeFile(
    path.join(OUTPUT_DIR, 'buckets.json'),
    JSON.stringify(bucketMetadata, null, 2),
  );

  const summary: Array<{ bucket: string; objects: number }> = [];

  for (const bucket of BUCKETS) {
    console.log(`Backing up storage bucket: ${bucket}`);
    const objects = await fetchObjects(bucket);
    const bucketDir = path.join(OUTPUT_DIR, bucket);

    await mkdir(bucketDir, { recursive: true });
    await writeFile(
      path.join(bucketDir, '_objects.json'),
      JSON.stringify(objects, null, 2),
    );

    for (const object of objects) {
      await downloadObject(bucket, object.name, bucketDir);
    }

    summary.push({ bucket, objects: objects.length });
    console.log(`Bucket ${bucket}: backed up ${objects.length} objects`);
  }

  await writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(
      {
        created_at: startedAt,
        completed_at: new Date().toISOString(),
        buckets: summary,
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Storage backup failed: ${message}`);
  process.exit(1);
});
