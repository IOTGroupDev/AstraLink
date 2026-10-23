import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { SensitiveProfileEncryptionService } from '../common/services/sensitive-profile-encryption.service';

const fieldPairs = [
  ['birth_date_encrypted', 'birth_date'],
  ['birth_time_encrypted', 'birth_time'],
  ['birth_place_encrypted', 'birth_place'],
] as const;
type BirthField = (typeof fieldPairs)[number][number];
type BirthRow = Partial<Record<BirthField, string | null>>;

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  // The audit prints aggregates only. Per-record decrypt warnings would obscure
  // those totals; neither decrypted values nor ciphertexts are logged or saved.
  Logger.overrideLogger(false);
  const encryption = new SensitiveProfileEncryptionService();
  if (!encryption.isConfigured())
    throw new Error('DATA_ENCRYPTION_KEY is required');
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const summaries = [];
  for (const table of ['users', 'compatibility_reports'] as const) {
    const select = fieldPairs
      .map(([field]) =>
        table === 'users' ? field : `${field}:partner_birth_data->>${field}`,
      )
      .join(',');
    const summary = {
      table,
      rows: 0,
      rowsWithEncryptedData: 0,
      rowsWithUnreadableData: 0,
      encryptedFields: 0,
      readableFields: 0,
      unreadableFields: 0,
    };
    for (let from = 0; ; from += 500) {
      const { data, error } = await admin
        .from(table)
        .select(select)
        .order('id', { ascending: true })
        .range(from, from + 499);
      if (error)
        throw new Error(
          `Read-only audit query failed for ${table} (${error.code})`,
        );
      const rows = (data ?? []) as unknown as BirthRow[];
      for (const row of rows) {
        summary.rows++;
        if (fieldPairs.some(([field]) => Boolean(row[field])))
          summary.rowsWithEncryptedData++;
        const hydrated = encryption.hydrateBirthData(row);
        if (
          fieldPairs.some(
            ([encrypted, plain]) => row[encrypted] && hydrated[plain] == null,
          )
        ) {
          summary.rowsWithUnreadableData++;
        }
        for (const [encrypted, plain] of fieldPairs) {
          if (!row[encrypted]) continue;
          summary.encryptedFields++;
          if (hydrated[plain] != null) summary.readableFields++;
          else summary.unreadableFields++;
        }
      }
      if (rows.length < 500) break;
    }
    summaries.push(summary);
  }
  console.log(JSON.stringify({ mode: 'read-only', summaries }, null, 2));
  if (summaries.some((summary) => summary.unreadableFields > 0))
    process.exitCode = 2;
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Encryption audit failed',
  );
  process.exitCode = 1;
});
