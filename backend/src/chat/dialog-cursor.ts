import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

// Preserve Postgres microseconds so page cursors do not omit adjacent messages.
export function messageTimestamp(value: unknown): string {
  const raw =
    typeof value === 'string' ? value : new Date(value as number).toISOString();
  const match = raw.match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)?$/,
  );
  if (!match) return new Date(raw).toISOString();
  return `${match[1]}.${(match[2] || '').padEnd(6, '0')}Z`;
}

export function decodeDialogCursor(value: string): {
  createdAt: string;
  id: string;
} {
  const [createdAt, id, extra] = value.split('~');
  if (
    extra !== undefined ||
    !isUUID(id || '') ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(
      createdAt || '',
    ) ||
    !Number.isFinite(new Date(createdAt).getTime())
  ) {
    throw new BadRequestException('Invalid message history cursor');
  }
  return { createdAt, id };
}
