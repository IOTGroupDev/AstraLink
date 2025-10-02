import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '../../types';

export class SubscriptionStatusResponseDto {
  @ApiProperty({ enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isTrial: boolean;

  @ApiProperty({ type: [String] })
  features: string[];

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  trialEndsAt?: string;

  @ApiProperty({ required: false })
  daysRemaining?: number;
}
