export interface BirthDateParts {
  year: number;
  month: number;
  day: number;
}

export interface BirthTimeParts {
  hour: number;
  minute: number;
}

export function normalizeBirthDateValue(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    const parsed = new Date(Number(value));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export function normalizeBirthTimeValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getBirthDateParts(value: unknown): BirthDateParts | null {
  const normalized = normalizeBirthDateValue(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function getBirthTimeParts(value: unknown): BirthTimeParts | null {
  const normalized = normalizeBirthTimeValue(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function buildUtcBirthDateTime(
  birthDate: string,
  birthTime: string,
  timezoneHours: number,
): Date | null {
  const dateParts = getBirthDateParts(birthDate);
  const timeParts = getBirthTimeParts(birthTime);

  if (!dateParts || !timeParts || !Number.isFinite(timezoneHours)) {
    return null;
  }

  return new Date(
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
      0,
      0,
    ) -
      timezoneHours * 60 * 60 * 1000,
  );
}

export function deriveLocalBirthFieldsFromUtc(
  birthDateTimeUtc: string,
  timezoneHours: number,
): { birthDate: string; birthTime: string } | null {
  if (!birthDateTimeUtc || !Number.isFinite(timezoneHours)) {
    return null;
  }

  const utcDate = new Date(birthDateTimeUtc);
  if (Number.isNaN(utcDate.getTime())) {
    return null;
  }

  const shifted = new Date(utcDate.getTime() + timezoneHours * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const hour = String(shifted.getUTCHours()).padStart(2, '0');
  const minute = String(shifted.getUTCMinutes()).padStart(2, '0');

  return {
    birthDate: `${year}-${month}-${day}`,
    birthTime: `${hour}:${minute}`,
  };
}
