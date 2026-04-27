import { SensitiveProfileEncryptionService } from './sensitive-profile-encryption.service';

describe('SensitiveProfileEncryptionService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('nulls plaintext fields by default while adding encrypted shadows', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'test-encryption-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    delete process.env.BIRTH_DATA_WRITE_PLAINTEXT;

    const service = new SensitiveProfileEncryptionService();
    const payload = service.prepareBirthDataForStorage({
      birth_date: '1990-05-15T00:00:00.000Z',
      birth_time: '14:30',
      birth_place: 'Moscow',
    });

    expect(payload.birth_date).toBeNull();
    expect(payload.birth_time).toBeNull();
    expect(payload.birth_place).toBeNull();
    expect(payload.birth_date_encrypted).toMatch(/^v1\./);
    expect(payload.birth_time_encrypted).toMatch(/^v1\./);
    expect(payload.birth_place_encrypted).toMatch(/^v1\./);
  });

  it('keeps plaintext fields only when legacy dual-write is explicitly enabled', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'test-encryption-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    process.env.BIRTH_DATA_WRITE_PLAINTEXT = 'true';

    const service = new SensitiveProfileEncryptionService();
    const payload = service.prepareBirthDataForStorage({
      birth_date: '1990-05-15T00:00:00.000Z',
      birth_time: '14:30',
      birth_place: 'Moscow',
    });

    expect(payload.birth_date).toBe('1990-05-15T00:00:00.000Z');
    expect(payload.birth_time).toBe('14:30');
    expect(payload.birth_place).toBe('Moscow');
    expect(payload.birth_date_encrypted).toMatch(/^v1\./);
    expect(payload.birth_time_encrypted).toMatch(/^v1\./);
    expect(payload.birth_place_encrypted).toMatch(/^v1\./);
  });

  it('hydrates canonical birth fields from encrypted shadows', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'test-encryption-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    process.env.BIRTH_DATA_WRITE_PLAINTEXT = 'false';

    const service = new SensitiveProfileEncryptionService();
    const storedPayload = service.prepareBirthDataForStorage({
      birth_date: '1990-05-15T00:00:00.000Z',
      birth_time: '14:30',
      birth_place: 'Moscow',
    });

    const hydrated = service.hydrateBirthData({
      birth_date: storedPayload.birth_date,
      birth_time: storedPayload.birth_time,
      birth_place: storedPayload.birth_place,
      birth_date_encrypted: storedPayload.birth_date_encrypted ?? null,
      birth_time_encrypted: storedPayload.birth_time_encrypted ?? null,
      birth_place_encrypted: storedPayload.birth_place_encrypted ?? null,
    });

    expect(hydrated.birth_date).toBe('1990-05-15T00:00:00.000Z');
    expect(hydrated.birth_time).toBe('14:30');
    expect(hydrated.birth_place).toBe('Moscow');
  });
});
