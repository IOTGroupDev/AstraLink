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

  private resolveKey(): Buffer | null {
    const secret = process.env.DATA_ENCRYPTION_KEY?.trim();
    if (!secret) {
      return null;
    }

    return createHash('sha256').update(secret, 'utf8').digest();
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  isPlaintextBirthDataWriteEnabled(): boolean {
    return process.env.BIRTH_DATA_WRITE_PLAINTEXT === 'true';
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
        !ciphertextBase64 ||
        !tagBase64
      ) {
        return fallback ?? null;
      }

      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(ivBase64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextBase64, 'base64')),
        decipher.final(),
      ]).toString('utf8');

      return plaintext;
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
