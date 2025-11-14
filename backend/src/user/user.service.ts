import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileRequest } from '../types';
import { UserProfileUpdatedEvent, BirthDataChangedEvent } from './events';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    return user;
  }

  async updateProfile(userId: number, updateData: UpdateProfileRequest) {
    // Get old data before update for event emission
    const oldUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        birthPlace: true,
        birthTime: true,
      },
    });

    if (!oldUser) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Perform the update
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        updatedAt: true,
      },
    });

    // Emit general profile updated event
    this.eventEmitter.emit(
      'user.profile.updated',
      new UserProfileUpdatedEvent(
        userId,
        {
          name: oldUser.name,
          birthPlace: oldUser.birthPlace,
          birthTime: oldUser.birthTime,
        },
        {
          name: updatedUser.name,
          birthPlace: updatedUser.birthPlace,
          birthTime: updatedUser.birthTime,
        },
      ),
    );

    // Check if birth data changed and emit specialized event
    const birthDataChanges: BirthDataChangedEvent['changes'] = {};

    if (
      updateData.birthPlace !== undefined &&
      oldUser.birthPlace !== updateData.birthPlace
    ) {
      birthDataChanges.birthPlace = {
        old: oldUser.birthPlace,
        new: updateData.birthPlace ?? null,
      };
    }

    if (
      updateData.birthTime !== undefined &&
      oldUser.birthTime !== updateData.birthTime
    ) {
      birthDataChanges.birthTime = {
        old: oldUser.birthTime,
        new: updateData.birthTime ?? null,
      };
    }

    // Emit birth data changed event if any birth data was modified
    if (Object.keys(birthDataChanges).length > 0) {
      const birthDataEvent = new BirthDataChangedEvent(
        userId,
        birthDataChanges,
      );
      this.eventEmitter.emit('user.birthData.changed', birthDataEvent);
    }

    return updatedUser;
  }
}
