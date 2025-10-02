import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionTierDto {
  @ApiProperty({ example: 'premium', description: 'Уровень подписки' })
  tier: string;
}
