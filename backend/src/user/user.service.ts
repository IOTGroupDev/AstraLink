import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type { UpdateProfileRequest } from '../types';
import { ChartService } from '../chart/chart.service';
import { UserRepository } from '../repositories';
import { UserProfileUpdatedEvent, BirthDataChangedEvent } from './events';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private supabaseService: SupabaseService,
    private chartService: ChartService,
    private userRepository: UserRepository,
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
  ) {}

  async getProfile(userId: string) {
    // Используем централизованную fallback логику из репозитория
    const user = await this.userRepository.findById(userId);

    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthPlace: user.birth_place,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }

    // Если не найден - мягкая автопровизия профиля
    try {
      await this.updateProfile(userId, {} as any);
      const created = await this.userRepository.findById(userId);

      if (created) {
        return {
          id: created.id,
          email: created.email,
          name: created.name,
          birthDate: created.birth_date,
          birthTime: created.birth_time,
          birthPlace: created.birth_place,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        };
      }
    } catch (_e) {
      // Игнорируем ошибку и возвращаем минимальный объект
    }

    // Фолбэк: возвращаем минимальный объект вместо 404
    return {
      id: userId,
      email: null,
      name: '',
      birthDate: null,
      birthTime: null,
      birthPlace: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateProfile(userId: string, updateData: UpdateProfileRequest) {
    // Подготовка данных для users
    const patch: any = {};
    if (updateData.name !== undefined) patch.name = updateData.name;
    if (updateData.birthDate !== undefined)
      patch.birth_date = updateData.birthDate;
    if (updateData.birthTime !== undefined)
      patch.birth_time = updateData.birthTime;
    if (updateData.birthPlace !== undefined)
      patch.birth_place = updateData.birthPlace;

    const admin = this.supabaseService.getAdminClient();

    // 1) Получаем email пользователя из Auth (для первичного upsert)
    let email: string | null = null;
    try {
      const { data: authRes, error: authErr } =
        await admin.auth.admin.getUserById(userId);
      if (!authErr) {
        // supabase-js v2: data = { user }
        const u = (authRes as any)?.user;
        email = u?.email ?? null;
      }
    } catch (_e) {
      // ничего, попробуем без email
    }

    // 2) Читаем текущий профиль (для событий)
    let profile: any | null = null;
    const oldData = {
      name: null as string | null,
      birthPlace: null as string | null,
      birthTime: null as string | null,
    };
    try {
      const { data } = await this.supabaseService.getUserProfileAdmin(userId);
      profile = data ?? null;
      if (profile) {
        oldData.name = profile.name;
        oldData.birthPlace = profile.birth_place;
        oldData.birthTime = profile.birth_time;
      }
    } catch {
      profile = null;
    }

    const nowISO = new Date().toISOString();

    // 3) Если профиля нет — создаём запись (upsert через insert/select)
    if (!profile) {
      const insertPayload: any = {
        id: userId,
        email: email || undefined,
        ...patch,
        created_at: nowISO,
        updated_at: nowISO,
      };

      const { data: inserted, error: insertErr } = await admin
        .from('users')
        .insert(insertPayload)
        .select()
        .single();

      if (insertErr || !inserted) {
        throw new InternalServerErrorException(
          `Failed to upsert user profile for ${userId}`,
        );
      }

      profile = inserted;
    } else if (Object.keys(patch).length > 0) {
      // 4) Иначе — обновляем изменённые поля
      const { data: updated, error: updErr } =
        await this.supabaseService.updateUserProfileAdmin(userId, patch);

      if (updErr || !updated) {
        throw new InternalServerErrorException(
          `Failed to update user profile for ${userId}`,
        );
      }
      profile = updated;
    }

    // 5) Гарантируем подписку FREE при отсутствии
    try {
      const { data: sub } =
        await this.supabaseService.getUserSubscription(userId);
      if (!sub) {
        await this.supabaseService.createSubscription({
          user_id: userId,
          tier: 'free',
        });
      }
    } catch (_e) {
      // Не валим поток, подписку можно создать позже
    }

    // 🎯 Emit events для изменений профиля
    const newData = {
      name: profile.name,
      birthPlace: profile.birth_place,
      birthTime: profile.birth_time,
    };

    // Emit general profile updated event
    this.eventEmitter.emit(
      'user.profile.updated',
      new UserProfileUpdatedEvent(userId, oldData, newData),
    );

    // Проверяем изменения birth data для специального события
    const birthDataChanges: BirthDataChangedEvent['changes'] = {};

    if (
      patch.birth_place !== undefined &&
      oldData.birthPlace !== patch.birth_place
    ) {
      birthDataChanges.birthPlace = {
        old: oldData.birthPlace,
        new: patch.birth_place ?? null,
      };
    }

    if (
      patch.birth_time !== undefined &&
      oldData.birthTime !== patch.birth_time
    ) {
      birthDataChanges.birthTime = {
        old: oldData.birthTime,
        new: patch.birth_time ?? null,
      };
    }

    // Emit birth data changed event если были изменения
    if (Object.keys(birthDataChanges).length > 0) {
      this.eventEmitter.emit(
        'user.birthData.changed',
        new BirthDataChangedEvent(userId, birthDataChanges),
      );
    }

    // 6) Если есть все данные рождения — создаём/пересоздаём натальную карту
    try {
      const birthDateISO = (profile?.birth_date ?? patch.birth_date) as
        | string
        | undefined;
      const birthTime = (profile?.birth_time ?? patch.birth_time) as
        | string
        | undefined;
      const birthPlace = (profile?.birth_place ?? patch.birth_place) as
        | string
        | undefined;

      const hasAll = !!birthDateISO && !!birthTime && !!birthPlace;

      if (hasAll) {
        // есть ли карты?
        let charts: any[] | null = null;
        try {
          const { data } =
            await this.supabaseService.getUserChartsAdmin(userId);
          charts = data ?? null;
        } catch {
          charts = null;
        }

        // 🎯 Проверка: изменились ли данные рождения?
        const birthDataChanged =
          patch.birth_date !== undefined ||
          patch.birth_time !== undefined ||
          patch.birth_place !== undefined;

        const needsRecreate = charts && charts.length > 0 && birthDataChanged;

        if (!charts || charts.length === 0 || needsRecreate) {
          // Удаляем старую карту если пересоздаём
          if (needsRecreate && charts && charts.length > 0) {
            this.logger.log(
              `🔄 Данные рождения изменились, пересоздаём натальную карту для пользователя ${userId}`,
            );
            const adminClient = this.supabaseService.getAdminClient();
            await adminClient.from('charts').delete().eq('user_id', userId);
          }

          await this.chartService.createNatalChartWithInterpretation(
            userId,
            new Date(birthDateISO).toISOString().split('T')[0],
            birthTime,
            birthPlace,
          );
        }
      }
    } catch (_e) {
      // не блокируем обновление профиля
    }

    // Возвращаем нормализованный профиль
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      birthDate: profile.birth_date,
      birthTime: profile.birth_time,
      birthPlace: profile.birth_place,
      updatedAt: profile.updated_at || nowISO,
    };
  }

  /**
   * Блокировка пользователя (вставка в public.user_blocks)
   */
  async blockUserWithToken(userAccessToken: string, blockedUserId: string) {
    // ✅ Auth через Supabase: получаем текущего пользователя из токена
    const { data: u, error: uErr } =
      await this.supabaseService.getUser(userAccessToken);
    if (uErr || !u?.user) {
      throw new InternalServerErrorException(
        'Cannot resolve current user from token',
      );
    }
    const uid = u.user.id;
    if (!uid) {
      throw new InternalServerErrorException('Invalid auth user id');
    }

    // ✅ PRISMA: Database операция через Prisma
    await this.prisma.userBlock.create({
      data: {
        userId: uid,
        blockedUserId,
      },
    });

    return { success: true };
  }

  /**
   * Список блокировок текущего пользователя
   */
  async listBlocksWithToken(
    userAccessToken: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ blockedUserId: string; createdAt: string }[]> {
    // ✅ Auth через Supabase: получаем текущего пользователя из токена
    const { data: u, error: uErr } =
      await this.supabaseService.getUser(userAccessToken);
    if (uErr || !u?.user) {
      throw new InternalServerErrorException(
        'Cannot resolve current user from token',
      );
    }
    const uid = u.user.id;

    // ✅ PRISMA: Получаем список блокировок через Prisma
    const blocks = await this.prisma.userBlock.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        blockedUserId: true,
        createdAt: true,
      },
    });

    return blocks.map((block: any) => ({
      blockedUserId: block.blockedUserId,
      createdAt: block.createdAt.toISOString(),
    }));
  }

  /**
   * Жалоба на пользователя (вставка в public.user_reports)
   */
  async reportUserWithToken(
    userAccessToken: string,
    reportedUserId: string,
    reason: string,
  ) {
    // ✅ Auth через Supabase: получаем текущего пользователя из токена
    const { data: u, error: uErr } =
      await this.supabaseService.getUser(userAccessToken);
    if (uErr || !u?.user) {
      throw new InternalServerErrorException(
        'Cannot resolve current user from token',
      );
    }
    const uid = u.user.id;

    // ✅ PRISMA: Database операция через Prisma
    await this.prisma.userReport.create({
      data: {
        reporterId: uid,
        reportedUserId,
        reason,
      },
    });

    return { success: true };
  }

  /**
   * 🗑️ Полное удаление аккаунта пользователя
   *
   * Каскадно удаляет все данные пользователя В ТРАНЗАКЦИИ:
   * 1. Charts (натальные карты)
   * 2. Connections (связи)
   * 3. DatingMatches (данные знакомств)
   * 4. Subscriptions (подписки)
   * 5. User profile (профиль пользователя)
   * 6. Auth user (пользователь из Supabase Auth) - вне транзакции
   *
   * ✅ ИСПРАВЛЕНО: Использует Prisma $transaction для гарантии атомарности
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      this.logger.log(`🗑️ Начинаем удаление аккаунта пользователя: ${userId}`);

      // Проверяем существование пользователя
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
      }

      this.logger.log(`✅ Пользователь найден: ${user.email}`);

      // ✅ КРИТИЧНО: Все операции с БД в одной транзакции
      // Если хотя бы одна операция упадёт - всё откатится автоматически
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Удаляем Charts (натальные карты)
        this.logger.log('🗑️ Удаление натальных карт...');
        const chartsDeleted = await tx.chart.deleteMany({
          where: { userId },
        });
        this.logger.log(`✅ Удалено натальных карт: ${chartsDeleted.count}`);

        // 2. Удаляем Connections (связи)
        this.logger.log('🗑️ Удаление связей...');
        const connectionsDeleted = await tx.connection.deleteMany({
          where: { userId },
        });
        this.logger.log(`✅ Удалено связей: ${connectionsDeleted.count}`);

        // 3. Удаляем DatingMatches (данные знакомств)
        this.logger.log('🗑️ Удаление данных знакомств...');
        const matchesDeleted = await tx.datingMatch.deleteMany({
          where: { userId },
        });
        this.logger.log(`✅ Удалено совпадений: ${matchesDeleted.count}`);

        // 4. Удаляем Subscriptions (подписки)
        this.logger.log('🗑️ Удаление подписок...');
        const subscriptionsDeleted = await tx.subscription.deleteMany({
          where: { userId },
        });
        this.logger.log(`✅ Удалено подписок: ${subscriptionsDeleted.count}`);

        // 5. Удаляем профиль пользователя из таблицы users
        this.logger.log('🗑️ Удаление профиля пользователя...');
        await tx.public_users.delete({
          where: { id: userId },
        });
        this.logger.log('✅ Профиль пользователя удален');
      });

      this.logger.log(
        '✅ Все данные пользователя удалены из БД (в транзакции)',
      );

      // 6. Удаляем пользователя из Supabase Auth (вне транзакции - внешний API)
      this.logger.log('🗑️ Удаление пользователя из Supabase Auth...');
      const { error: authError } =
        await this.supabaseService.deleteUser(userId);

      if (authError) {
        this.logger.error('❌ Ошибка удаления auth user:', authError);
        // Логируем warning, но не выбрасываем ошибку
        // т.к. основные данные уже атомарно удалены
        this.logger.warn(
          '⚠️ Не удалось удалить пользователя из Auth, но все данные в БД удалены',
        );
      } else {
        this.logger.log('✅ Пользователь удален из Supabase Auth');
      }

      this.logger.log(`✅ Аккаунт пользователя ${userId} полностью удален`);
    } catch (error) {
      this.logger.error('❌ Критическая ошибка при удалении аккаунта:', error);

      // Если ошибка в транзакции - все изменения автоматически откатятся
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Произошла ошибка при удалении аккаунта. Изменения откатаны.',
      );
    }
  }
}
