import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SupabaseService } from '../../supabase/supabase.service';
import { BirthDataChangedEvent } from '../../user/events';

@Injectable()
export class ChartEventListener {
  private readonly logger = new Logger(ChartEventListener.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Handles birth data changes by invalidating cached charts
   * When a user's birth data changes, all their cached natal charts
   * must be deleted to force recalculation with new birth information
   */
  @OnEvent('user.birthData.changed')
  async handleBirthDataChanged(event: BirthDataChangedEvent) {
    const { userId, changes } = event;
    const changedFields = event.getChangedFields();

    this.logger.log(
      `Birth data changed for user ${userId}. Changed fields: ${changedFields.join(', ')}`,
    );

    try {
      // Delete all cached charts for this user using admin client
      const adminClient = this.supabaseService.getAdminClient();
      const { error, count } = await adminClient
        .from('charts')
        .delete({ count: 'exact' })
        .eq('user_id', userId);

      if (error) {
        this.logger.error(
          `Failed to invalidate charts for user ${userId}: ${error.message}`,
        );
        return;
      }

      this.logger.log(
        `Invalidated ${count || 0} chart(s) for user ${userId} due to birth data change`,
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
