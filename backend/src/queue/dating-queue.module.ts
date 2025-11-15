import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueModule } from './queue.module';
import { CompatibilityCalculatorProcessor } from './processors/compatibility-calculator.processor';
import { RedisModule } from '@/redis/redis.module';
import { ServicesModule } from '@/services/services.module';

/**
 * Dating Queue Module
 *
 * Provides background job processing for dating/compatibility features:
 * - Pre-calculation of synastry between charts
 * - Batch compatibility calculations
 * - Heavy astrological computations
 *
 * Uses Bull queues with Redis backend
 */
@Module({
  imports: [
    QueueModule,
    RedisModule,
    ServicesModule,
    BullModule.registerQueue({
      name: 'compatibility-calculation',
    }),
  ],
  providers: [CompatibilityCalculatorProcessor],
  exports: [BullModule],
})
export class DatingQueueModule {}
