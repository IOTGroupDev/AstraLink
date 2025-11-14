import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BirthDataChangedEvent } from '../../user/events';

@Injectable()
export class ConnectionEventListener {
  private readonly logger = new Logger(ConnectionEventListener.name);

  /**
   * Handles birth data changes to log that synastry data will be recalculated
   *
   * Note: Synastry calculations are performed on-demand using the latest natal chart
   * from the Chart table. Since ChartEventListener deletes cached charts when birth
   * data changes, synastry will automatically use the new chart on the next request.
   *
   * This listener exists primarily for logging and monitoring purposes.
   */
  @OnEvent('user.birthData.changed')
  async handleBirthDataChanged(event: BirthDataChangedEvent) {
    const { userId, changes } = event;
    const changedFields = event.getChangedFields();

    this.logger.log(
      `Birth data changed for user ${userId}. Synastry data will be recalculated on next request. Changed fields: ${changedFields.join(', ')}`,
    );

    // Log specific changes for audit trail
    if (changes.birthPlace) {
      this.logger.debug(
        `User ${userId} birth place: "${changes.birthPlace.old}" → "${changes.birthPlace.new}"`,
      );
    }
    if (changes.birthTime) {
      this.logger.debug(
        `User ${userId} birth time: "${changes.birthTime.old}" → "${changes.birthTime.new}"`,
      );
    }

    // Future enhancement: Could emit additional events here for:
    // - Notifying users with connections to this user
    // - Invalidating cached compatibility scores
    // - Triggering background recalculation of synastry data
  }
}
