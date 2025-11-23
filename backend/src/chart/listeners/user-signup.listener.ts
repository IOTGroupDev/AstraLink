import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserSignupCompletedEvent } from '@/auth/events';
import { ChartService } from '../chart.service';

/**
 * Listens to user signup events and creates natal chart
 * This decouples AuthModule from ChartModule (no circular dependency)
 */
@Injectable()
export class UserSignupListener {
  private readonly logger = new Logger(UserSignupListener.name);

  constructor(private readonly chartService: ChartService) {}

  @OnEvent('user.signup.completed')
  async handleUserSignupCompleted(event: UserSignupCompletedEvent) {
    this.logger.log(
      `Creating natal chart for user ${event.userId} after signup completion`,
    );

    try {
      await this.chartService.createNatalChart(event.userId, {
        birthDate: event.birthData.birthDate,
        birthTime: event.birthData.birthTime,
        birthPlace: event.birthData.birthPlace,
        latitude: event.birthData.latitude,
        longitude: event.birthData.longitude,
        timezone: event.birthData.timezone,
      });

      this.logger.log(
        `Natal chart created successfully for user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create natal chart for user ${event.userId}:`,
        error,
      );
      // Don't throw - chart creation failure shouldn't block signup
      // User can create chart later manually
    }
  }
}
