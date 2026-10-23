import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

type BirthProfilePayload = {
  birth_date?: unknown;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_date_encrypted?: string | null;
  birth_time_encrypted?: string | null;
  birth_place_encrypted?: string | null;
};

type PreparedBirthProfilePayload<T extends BirthProfilePayload> = T & {
  birth_date_encrypted?: string | null;
  birth_time_encrypted?: string | null;
  birth_place_encrypted?: string | null;
};

const ENCRYPTION_VERSION = 'v1';
const GCM_IV_LENGTH = 12;

@Injectable()
export class SensitiveProfileEncryptionService {
  private readonly logger = new Logger(SensitiveProfileEncryptionService.name);
  private readonly key = this.resolveKey();
  private readonly previousKeys = this.resolvePreviousKeys();

  private resolveKey(): Buffer | null {
    const secret = process.env.DATA_ENCRYPTION_KEY?.trim();
    if (!secret) {
      return null;
    }

    return createHash('sha256').update(secret, 'utf8').digest();
  }

  private resolvePreviousKeys(): Buffer[] {
    const raw = process.env.DATA_ENCRYPTION_PREVIOUS_KEYS?.trim();
    if (!raw) return [];

    let secrets: unknown;
    try {
      secrets = JSON.parse(raw);
    } catch {
      throw new Error(
        'DATA_ENCRYPTION_PREVIOUS_KEYS must be a JSON array of previous secrets',
      );
    }
    if (
      !Array.isArray(secrets) ||
      secrets.length > 8 ||
      secrets.some(
        (secret: unknown) => typeof secret !== 'string' || !secret.trim(),
      )
    ) {
      throw new Error(
        'DATA_ENCRYPTION_PREVIOUS_KEYS must contain up to 8 nonempty secrets',
      );
    }
    if (secrets.length && !this.key) {
      throw new Error(
        'DATA_ENCRYPTION_KEY is required when previous encryption keys are configured',
      );
    }

    const keys = new Map<string, Buffer>();
    for (const secret of secrets as string[]) {
      const key = createHash('sha256').update(secret.trim(), 'utf8').digest();
      if (!this.key?.equals(key)) keys.set(key.toString('hex'), key);
    }
    return [...keys.values()];
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  isPlaintextBirthDataWriteEnabled(): boolean {
    return process.env.BIRTH_DATA_WRITE_PLAINTEXT === 'true';
  }

  /** Keep calculated planets readable internally; encrypt redundant civil birth metadata. */
  prepareBirthDocumentForStorage<T>(payload: T): T {
    if (
      !this.key ||
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    )
      return payload;
    const document = { ...this.hydrateBirthDocument(payload) } as Record<
      string,
      unknown
    >;
    const sensitive: Record<string, unknown> = {};
    for (const key of [
      'birthDate',
      'birthTime',
      'birthDateTimeUtc',
      'birthPlace',
      'location',
      'birth_date',
      'birth_time',
      'birth_place',
      'latitude',
      'longitude',
      'timezone',
    ]) {
      if (Object.prototype.hasOwnProperty.call(document, key)) {
        sensitive[key] = document[key];
        delete document[key];
      }
    }
    if (Object.keys(sensitive).length)
      document.encryptedBirthMetadata = this.encryptValue(
        JSON.stringify(sensitive),
      );
    return document as T;
  }

  hydrateBirthDocument<T>(payload: T): T {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      return payload;
    const document = payload as Record<string, unknown>;
    if (typeof document.encryptedBirthMetadata !== 'string') return payload;
    const plaintext = this.decryptValue(document.encryptedBirthMetadata, null);
    if (plaintext === null)
      throw new Error('Birth document encryption key is unavailable');
    const sensitive: unknown = JSON.parse(plaintext);
    if (!sensitive || typeof sensitive !== 'object' || Array.isArray(sensitive))
      throw new Error('Invalid encrypted birth document');
    const result = { ...document, ...sensitive };
    delete result.encryptedBirthMetadata;
    return result as T;
  }

  prepareBirthDataForStorage<T extends BirthProfilePayload>(
    payload: T,
  ): PreparedBirthProfilePayload<T> {
    if (!this.key) {
      return payload as PreparedBirthProfilePayload<T>;
    }

    const nextPayload = { ...payload } as PreparedBirthProfilePayload<T>;

    if (Object.prototype.hasOwnProperty.call(nextPayload, 'birth_date')) {
      nextPayload.birth_date_encrypted = this.encryptValue(
        this.normalizeBirthDateStorageValue(nextPayload.birth_date),
      );
      if (!this.isPlaintextBirthDataWriteEnabled()) {
        nextPayload.birth_date = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(nextPayload, 'birth_time')) {
      nextPayload.birth_time_encrypted = this.encryptValue(
        nextPayload.birth_time,
      );
      if (!this.isPlaintextBirthDataWriteEnabled()) {
        nextPayload.birth_time = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(nextPayload, 'birth_place')) {
      nextPayload.birth_place_encrypted = this.encryptValue(
        nextPayload.birth_place,
      );
      if (!this.isPlaintextBirthDataWriteEnabled()) {
        nextPayload.birth_place = null;
      }
    }

    return nextPayload;
  }

  hydrateBirthData<T extends BirthProfilePayload>(payload: T): T {
    if (!this.key) {
      return payload;
    }

    const nextPayload = { ...payload };

    const decryptedBirthDate = this.decryptValue(
      nextPayload.birth_date_encrypted,
      this.normalizeBirthDateStorageValue(nextPayload.birth_date),
    );
    if (decryptedBirthDate !== null) {
      nextPayload.birth_date = decryptedBirthDate;
    }

    const decryptedBirthTime = this.decryptValue(
      nextPayload.birth_time_encrypted,
      nextPayload.birth_time,
    );
    if (decryptedBirthTime !== null) {
      nextPayload.birth_time = decryptedBirthTime;
    }

    const decryptedBirthPlace = this.decryptValue(
      nextPayload.birth_place_encrypted,
      nextPayload.birth_place,
    );
    if (decryptedBirthPlace !== null) {
      nextPayload.birth_place = decryptedBirthPlace;
    }

    return nextPayload;
  }

  private normalizeBirthDateStorageValue(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }

    return null;
  }

  private encryptValue(value: string | null | undefined): string | null {
    if (!this.key || value == null) {
      return value ?? null;
    }

    const iv = randomBytes(GCM_IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      ENCRYPTION_VERSION,
      iv.toString('base64'),
      ciphertext.toString('base64'),
      tag.toString('base64'),
    ].join('.');
  }

  private decryptValue(
    encryptedValue: string | null | undefined,
    fallback: string | null | undefined,
  ): string | null {
    if (!this.key || !encryptedValue) {
      return fallback ?? null;
    }

    try {
      const [version, ivBase64, ciphertextBase64, tagBase64] =
        encryptedValue.split('.');

      if (
        version !== ENCRYPTION_VERSION ||
        !ivBase64 ||
        ciphertextBase64 === undefined ||
        !tagBase64
      ) {
        return fallback ?? null;
      }

      let lastError: unknown;
      for (const key of [this.key, ...this.previousKeys]) {
        const chunks: Buffer[] = [];
        try {
          const decipher = createDecipheriv(
            'aes-256-gcm',
            key,
            Buffer.from(ivBase64, 'base64'),
            { authTagLength: 16 },
          );
          decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
          chunks.push(decipher.update(Buffer.from(ciphertextBase64, 'base64')));
          chunks.push(decipher.final());
          return Buffer.concat(chunks).toString('utf8');
        } catch (error) {
          lastError = error;
        } finally {
          for (const chunk of chunks) chunk.fill(0);
        }
      }
      throw lastError;
    } catch (error) {
      this.logger.warn(
        `Failed to decrypt sensitive profile data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return fallback ?? null;
    }
  }
}
