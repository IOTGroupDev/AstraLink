import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../redis/redis.service';
import { BirthDataChangedEvent } from '../../user/events';

@Injectable()
export class ChartEventListener {
  private readonly logger = new Logger(ChartEventListener.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Handles birth data changes by invalidating derived caches.
   * The actual natal chart recalculation is handled in UserService, so
   * this listener must never delete chart rows and race with that flow.
   */
  @OnEvent('user.birthData.changed')
  async handleBirthDataChanged(event: BirthDataChangedEvent) {
    const { userId, changes } = event;
    const changedFields = event.getChangedFields();

    this.logger.log(
      `Birth data changed for user ${userId}. Changed fields: ${changedFields.join(', ')}`,
    );

    try {
      const [horoscopeDeleted, transitDeleted] = await Promise.all([
        this.redis.deleteByPattern(`horoscope:${userId}:*`),
        this.redis.deleteByPattern(`ephe:transits:${userId}:*`),
      ]);

      this.logger.log(
        `Invalidated caches for user ${userId} due to birth data change: horoscopes=${horoscopeDeleted}, transits=${transitDeleted}`,
      );

      // Log the specific changes for audit purposes
      if (changes.birthDate) {
        this.logger.debug(
          `Birth date changed from "${changes.birthDate.old}" to "${changes.birthDate.new}"`,
        );
      }
      if (changes.birthPlace) {
        this.logger.debug(
          `Birth place changed from "${changes.birthPlace.old}" to "${changes.birthPlace.new}"`,
        );
      }
      if (changes.birthTime) {
        this.logger.debug(
          `Birth time changed from "${changes.birthTime.old}" to "${changes.birthTime.new}"`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to invalidate derived caches for user ${userId}: ${error?.message || String(error)}`,
        error?.stack,
      );
      // Don't throw - this is a background operation
      // The main profile update should not fail if chart invalidation fails
    }
  }
}
