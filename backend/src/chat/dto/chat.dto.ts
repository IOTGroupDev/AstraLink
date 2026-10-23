import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() recipientId!: string;
  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;
  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  mediaPath?: string | null;
}
export class ChatMediaUploadDto {
  @ApiPropertyOptional({ enum: ['jpg', 'jpeg', 'png', 'webp'] })
  @IsOptional()
  @IsIn(['jpg', 'jpeg', 'png', 'webp'])
  ext?: string;
}
export class ChatLimitDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
export class DialogQueryDto extends ChatLimitDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() userId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  before?: string;
}
