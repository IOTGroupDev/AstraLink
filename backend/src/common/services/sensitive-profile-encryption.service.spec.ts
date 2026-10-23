import { SensitiveProfileEncryptionService } from './sensitive-profile-encryption.service';

describe('SensitiveProfileEncryptionService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.DATA_ENCRYPTION_PREVIOUS_KEYS;
    delete process.env.BIRTH_DATA_WRITE_PLAINTEXT;
  });

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

  it('reads old and current records while encrypting new writes with the active key', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'old-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    const oldService = new SensitiveProfileEncryptionService();
    const oldRecord = oldService.prepareBirthDataForStorage({
      birth_place: 'Moscow',
    });

    process.env.DATA_ENCRYPTION_KEY =
      'current-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    const currentOnly = new SensitiveProfileEncryptionService();
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify([
      'old-secret-1234567890-abcdefghijklmnopqrstuvwxyz',
    ]);
    const withPrevious = new SensitiveProfileEncryptionService();
    const currentRecord = withPrevious.prepareBirthDataForStorage({
      birth_place: 'Madrid',
    });

    expect(withPrevious.hydrateBirthData(oldRecord).birth_place).toBe('Moscow');
    expect(withPrevious.hydrateBirthData(currentRecord).birth_place).toBe(
      'Madrid',
    );
    expect(currentOnly.hydrateBirthData(currentRecord).birth_place).toBe(
      'Madrid',
    );
    expect(oldService.hydrateBirthData(currentRecord).birth_place).toBeNull();
  });

  it('never accepts ciphertext when none of the configured keys authenticate it', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'old-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    const record =
      new SensitiveProfileEncryptionService().prepareBirthDataForStorage({
        birth_time: '14:30',
      });
    process.env.DATA_ENCRYPTION_KEY =
      'wrong-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify([
      'another-wrong-secret',
    ]);
    const reader = new SensitiveProfileEncryptionService();

    expect(reader.hydrateBirthData(record).birth_time).toBeNull();
    expect(record.birth_time_encrypted).toBeTruthy();
  });

  it('preserves a legacy plaintext fallback without replacing the ciphertext', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'old-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    const record =
      new SensitiveProfileEncryptionService().prepareBirthDataForStorage({
        birth_place: 'Moscow',
      });
    process.env.DATA_ENCRYPTION_KEY =
      'wrong-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    const reader = new SensitiveProfileEncryptionService();

    const hydrated = reader.hydrateBirthData({
      ...record,
      birth_place: 'Legacy value',
    });
    expect(hydrated.birth_place).toBe('Legacy value');
    expect(hydrated.birth_place_encrypted).toBe(record.birth_place_encrypted);
  });

  it('rejects tampered ciphertext even when the correct previous key is configured', () => {
    const oldKey = 'old-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    process.env.DATA_ENCRYPTION_KEY = oldKey;
    const record =
      new SensitiveProfileEncryptionService().prepareBirthDataForStorage({
        birth_place: 'Moscow',
      });
    const parts = record.birth_place_encrypted!.split('.');
    const ciphertext = Buffer.from(parts[2], 'base64');
    ciphertext[0] ^= 1;
    parts[2] = ciphertext.toString('base64');
    process.env.DATA_ENCRYPTION_KEY =
      'current-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify([oldKey]);
    const reader = new SensitiveProfileEncryptionService();

    expect(
      reader.hydrateBirthData({
        ...record,
        birth_place_encrypted: parts.join('.'),
      }).birth_place,
    ).toBeNull();
  });

  it('authenticates an encrypted empty string', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'current-secret-1234567890-abcdefghijklmnopqrstuvwxyz';
    const service = new SensitiveProfileEncryptionService();
    const record = service.prepareBirthDataForStorage({ birth_place: '' });
    expect(service.hydrateBirthData(record).birth_place).toBe('');
  });

  it('rejects invalid previous key configuration without including secrets in errors', () => {
    const invalidValue = 'private-value-that-must-not-appear-in-the-error';
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = invalidValue;
    expect(() => new SensitiveProfileEncryptionService()).toThrow(
      'DATA_ENCRYPTION_PREVIOUS_KEYS must be a JSON array of previous secrets',
    );
  });

  it('requires an active write key when previous read keys are configured', () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify(['old-secret']);
    expect(() => new SensitiveProfileEncryptionService()).toThrow(
      'DATA_ENCRYPTION_KEY is required',
    );
  });

  it('encrypts redundant birth metadata inside chart JSON and preserves calculated planets', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'test-document-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    const service = new SensitiveProfileEncryptionService();
    const original = {
      birthDate: '1990-01-01',
      birthTime: '14:30',
      birthDateTimeUtc: '1990-01-01T11:30:00Z',
      location: { latitude: 55.75, longitude: 37.61, timezone: 3 },
      planets: { sun: { longitude: 280 } },
    };
    const stored = service.prepareBirthDocumentForStorage(original);
    expect(stored).not.toHaveProperty('birthDate');
    expect(stored).not.toHaveProperty('birthTime');
    expect(stored).not.toHaveProperty('birthDateTimeUtc');
    expect(stored).not.toHaveProperty('location');
    expect(stored.planets).toEqual(original.planets);
    expect(service.hydrateBirthDocument(stored)).toEqual(original);
    expect(original).toHaveProperty('birthDate');
    expect(
      service.hydrateBirthDocument(
        service.prepareBirthDocumentForStorage(stored),
      ),
    ).toEqual(original);
  });

  it('reads old plaintext chart JSON without modifying it', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'test-document-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    const original = { birthDate: '1990-01-01', planets: {} };
    expect(
      new SensitiveProfileEncryptionService().hydrateBirthDocument(original),
    ).toEqual(original);
  });

  it('rejects unavailable document keys instead of returning invented birth metadata', () => {
    process.env.DATA_ENCRYPTION_KEY =
      'old-document-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    const stored =
      new SensitiveProfileEncryptionService().prepareBirthDocumentForStorage({
        birthDate: '1990-01-01',
      });
    process.env.DATA_ENCRYPTION_KEY =
      'new-document-key-1234567890-abcdefghijklmnopqrstuvwxyz';
    expect(() =>
      new SensitiveProfileEncryptionService().hydrateBirthDocument(stored),
    ).toThrow('Birth document encryption key is unavailable');
    process.env.DATA_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify([
      'old-document-key-1234567890-abcdefghijklmnopqrstuvwxyz',
    ]);
    expect(
      new SensitiveProfileEncryptionService().hydrateBirthDocument(stored),
    ).toEqual({ birthDate: '1990-01-01' });
  });
});
