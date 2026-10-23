import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class DatingActionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetUserId!: string;

  @ApiPropertyOptional({
    enum: ['like', 'super_like', 'pass'],
    default: 'like',
  })
  @IsOptional()
  @IsIn(['like', 'super_like', 'pass'])
  action?: 'like' | 'super_like' | 'pass';
}
