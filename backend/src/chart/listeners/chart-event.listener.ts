import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { BirthDataChangedEvent } from '../../user/events';

@Injectable()
export class ChartEventListener {
  private readonly logger = new Logger(ChartEventListener.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Handles birth data changes by invalidating cached charts
   * When a user's birth data changes, all their cached natal charts
   * must be recalculated to reflect the new birth information
   */
  @OnEvent('user.birthData.changed')
  async handleBirthDataChanged(event: BirthDataChangedEvent) {
    const { userId, changes } = event;
    const changedFields = event.getChangedFields();

    this.logger.log(
      `Birth data changed for user ${userId}. Changed fields: ${changedFields.join(', ')}`,
    );

    try {
      // Delete all cached charts for this user
      // Charts will be recalculated on next request with new birth data
      const deletedCharts = await this.prisma.chart.deleteMany({
        where: { userId },
      });

      this.logger.log(
        `Invalidated ${deletedCharts.count} chart(s) for user ${userId} due to birth data change`,
      );

      // Log the specific changes for audit purposes
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
    } catch (error) {
      this.logger.error(
        `Failed to invalidate charts for user ${userId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - this is a background operation
      // The main profile update should not fail if chart invalidation fails
    }
  }
}
