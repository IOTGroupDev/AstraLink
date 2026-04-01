export type UserLocalPeriod = 'day' | 'tomorrow' | 'week' | 'month';

export interface UserLocalPeriodContext {
  targetDate: Date;
  dateKey: string;
  ttlSec: number;
  quotaDayKey: string;
  quotaTtlSec: number;
}

function getShiftedDate(date: Date, tzOffsetMinutes: number): Date {
  return new Date(date.getTime() + tzOffsetMinutes * 60_000);
}

function formatShiftedDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfShiftedWeek(date: Date): Date {
  const base = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - day);
  return base;
}

function toRealDate(shiftedDate: Date, tzOffsetMinutes: number): Date {
  return new Date(shiftedDate.getTime() - tzOffsetMinutes * 60_000);
}

export function buildUserLocalPeriodContext(
  period: UserLocalPeriod,
  tzOffsetMinutes = 0,
  now = new Date(),
): UserLocalPeriodContext {
  const safeOffset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;
  const userNow = getShiftedDate(now, safeOffset);
  const targetUserDate = new Date(userNow);

  switch (period) {
    case 'tomorrow':
      targetUserDate.setUTCDate(targetUserDate.getUTCDate() + 1);
      break;
    case 'week':
      targetUserDate.setUTCDate(targetUserDate.getUTCDate() + 7);
      break;
    case 'month':
      targetUserDate.setUTCDate(targetUserDate.getUTCDate() + 30);
      break;
    default:
      break;
  }

  const targetRealDate = toRealDate(targetUserDate, safeOffset);

  const dateKey =
    period === 'month'
      ? `${targetUserDate.getUTCFullYear()}-${String(targetUserDate.getUTCMonth() + 1).padStart(2, '0')}`
      : period === 'week'
        ? formatShiftedDate(startOfShiftedWeek(targetUserDate))
        : formatShiftedDate(targetUserDate);

  let bucketEndUserDate: Date;
  if (period === 'month') {
    bucketEndUserDate = new Date(
      Date.UTC(
        targetUserDate.getUTCFullYear(),
        targetUserDate.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
      ),
    );
  } else if (period === 'week') {
    const weekStart = startOfShiftedWeek(targetUserDate);
    bucketEndUserDate = new Date(weekStart);
    bucketEndUserDate.setUTCDate(bucketEndUserDate.getUTCDate() + 7);
  } else {
    bucketEndUserDate = new Date(
      Date.UTC(
        targetUserDate.getUTCFullYear(),
        targetUserDate.getUTCMonth(),
        targetUserDate.getUTCDate() + 1,
        0,
        0,
        0,
      ),
    );
  }

  const bucketEndRealDate = toRealDate(bucketEndUserDate, safeOffset);
  const ttlSec = Math.max(
    60,
    Math.floor((bucketEndRealDate.getTime() - now.getTime()) / 1000),
  );

  const nextLocalMidnightUserDate = new Date(
    Date.UTC(
      userNow.getUTCFullYear(),
      userNow.getUTCMonth(),
      userNow.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );
  const nextLocalMidnightRealDate = toRealDate(
    nextLocalMidnightUserDate,
    safeOffset,
  );
  const quotaTtlSec = Math.max(
    60,
    Math.floor((nextLocalMidnightRealDate.getTime() - now.getTime()) / 1000),
  );

  return {
    targetDate: targetRealDate,
    dateKey,
    ttlSec,
    quotaDayKey: formatShiftedDate(userNow),
    quotaTtlSec,
  };
}
