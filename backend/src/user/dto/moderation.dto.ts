import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Sanitize } from '@/common/decorators/sanitize.decorator';

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

  @Sanitize('basic') // Allow basic formatting for report reasons
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string; // public.user_reports.reason (text)
}
