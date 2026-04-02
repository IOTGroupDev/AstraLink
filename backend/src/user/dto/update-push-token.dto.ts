import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePushTokenDto {
  @ApiProperty({
    description: 'Expo push token for the current app installation',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString({ message: 'expoPushToken must be a string' })
  @MaxLength(255, {
    message: 'expoPushToken must not exceed 255 characters',
  })
  expoPushToken!: string;

  @ApiPropertyOptional({
    description: 'Whether this token should stay active for notifications',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'enabled must be a boolean' })
  enabled?: boolean;

  @ApiPropertyOptional({
    enum: ['ios', 'android'],
    description: 'Device platform that registered the token',
  })
  @IsOptional()
  @IsEnum(['ios', 'android'], {
    message: 'platform must be ios or android',
  })
  platform?: 'ios' | 'android';
}
