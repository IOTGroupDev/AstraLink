import { ApiProperty } from '@nestjs/swagger';

export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'premium', description: 'Новый уровень подписки' })
  tier: string;

  @ApiProperty({
    example: 'mock',
    required: false,
    description: 'Метод оплаты (для теста можно "mock")',
  })
  paymentMethod?: string;

  @ApiProperty({
    example: 'txn_123456',
    required: false,
    description: 'ID транзакции от платёжного провайдера',
  })
  transactionId?: string;
}
