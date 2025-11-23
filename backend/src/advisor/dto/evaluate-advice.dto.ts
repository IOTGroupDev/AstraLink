import { IsIn, IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export type AdvisorTopic =
  | 'contract'
  | 'meeting'
  | 'date'
  | 'travel'
  | 'purchase'
  | 'health'
  | 'negotiation'
  | 'custom';

export class EvaluateAdviceDto {
  @IsIn([
    'contract',
    'meeting',
    'date',
    'travel',
    'purchase',
    'health',
    'negotiation',
    'custom',
  ])
  topic!: AdvisorTopic;

  // ISO date (YYYY-MM-DD). We evaluate at 12:00 UTC for determinism in MVP.
  @IsISO8601({ strict: true })
  date!: string;

  // Optional IANA timezone (e.g. Europe/Moscow). Not used in MVP scoring (UTC noon), stored for future hourly windows.
  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;

  // Optional free text context
  @IsOptional()
  @IsString()
  @Length(0, 512)
  customNote?: string;
}
