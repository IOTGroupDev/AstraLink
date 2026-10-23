/** Resolve an IANA zone at the supplied local birth time, including UTC+0. */
export function historicalTimezoneOffset(
  timezone: string,
  birthDate?: string,
  birthTime?: string,
): number | null {
  if (!birthDate || !birthTime) return null;
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  const time = /^(\d{1,2}):(\d{2})$/.exec(birthTime);
  if (!date || !time) return null;
  try {
    const local = Date.UTC(
      +date[1],
      +date[2] - 1,
      +date[3],
      +time[1],
      +time[2],
    );
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    let offset = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      const label = formatter
        .formatToParts(new Date(local - offset * 3_600_000))
        .find((part) => part.type === 'timeZoneName')?.value;
      const isUtc = label === 'GMT' || label === 'UTC';
      const match = label?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/i);
      if (!match && !isUtc) return null;
      const next = isUtc
        ? 0
        : (match![1] === '-' ? -1 : 1) * (+match![2] + +(match![3] ?? 0) / 60);
      if (next === offset) return next;
      offset = next;
    }
    return null;
  } catch {
    return null;
  }
}
