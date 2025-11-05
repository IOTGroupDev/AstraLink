import { IsString, IsNotEmpty } from 'class-validator';

// DTO для блокировки пользователя
export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  blockedUserId!: string; // соответствует public.user_blocks.blocked_user_id (text)
}

// DTO для жалобы на пользователя
export class ReportUserDto {
  @IsString()
  @IsNotEmpty()
  reportedUserId!: string; // соответствует public.user_reports.reported_user_id (text)

  @IsString()
  @IsNotEmpty()
  reason!: string; // public.user_reports.reason (text)
}
