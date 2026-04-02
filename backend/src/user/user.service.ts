import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { UpdateProfileRequest } from '../types';
import { ChartService } from '../chart/chart.service';
import { UserRepository } from '../repositories';
import { UserProfileUpdatedEvent, BirthDataChangedEvent } from './events';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';

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

  private asJsonObject(value: unknown): Record<string, unknown> {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private normalizeExpoPushTokens(value: unknown): string[] {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  /**
   * Normalize birthDate for API responses as YYYY-MM-DD (без времени).
   * Важно: избегаем UTC-сдвига суток.
   */
  private formatBirthDate(value: unknown): string | null {
    if (!value) return null;

    // Если пришла строка вида "YYYY-MM-DD..." (включая ISO) — берём только дату
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;

      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
      }

      return null;
    }

    // Если Date — форматируем по локальным компонентам (без UTC)
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      const y = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }

    // Fallback: поддерживаем только числовые timestamp-значения.
    // Для объектов (и прочих типов) возвращаем null, чтобы не получить "[object Object]".
    if (typeof value === 'number') {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
    if (typeof value === 'bigint') {
      const d = new Date(Number(value));
      if (Number.isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
    return null;
  }

  private hasCompletedBirthData(profile: {
    birth_date?: unknown;
    birth_time?: string | null;
    birth_place?: string | null;
  }): boolean {
    return (
      !!this.formatBirthDate(profile.birth_date) &&
      !!profile.birth_time &&
      !!profile.birth_place
    );
  }

  private async syncOnboardingFlagsIfNeeded(user: {
    id: string;
    birth_date?: unknown;
    birth_time?: string | null;
    birth_place?: string | null;
    onboarding_completed?: boolean | null;
  }): Promise<void> {
    if (
      !this.hasCompletedBirthData(user) ||
      user.onboarding_completed === true
    ) {
      return;
    }

    const admin = this.supabaseService.getAdminClient();
    const nowIso = new Date().toISOString();

    const [usersResult, profilesResult] = await Promise.allSettled([
      admin
        .from('users')
        .update({
          onboarding_completed: true,
          updated_at: nowIso,
        })
        .eq('id', user.id),
      admin.from('user_profiles').upsert({
        user_id: user.id,
        is_onboarded: true,
        updated_at: nowIso,
      }),
    ]);

    if (
      usersResult.status === 'fulfilled' &&
      !usersResult.value.error &&
      profilesResult.status === 'fulfilled' &&
      !profilesResult.value.error
    ) {
      user.onboarding_completed = true;
      this.logger.log(`Healed onboarding flags for user ${user.id}`);
      return;
    }

    if (usersResult.status === 'rejected') {
      this.logger.warn(
        `Failed to sync public.users onboarding_completed for ${user.id}: ${String(usersResult.reason)}`,
      );
    } else if (usersResult.value.error) {
      this.logger.warn(
        `Failed to sync public.users onboarding_completed for ${user.id}`,
        usersResult.value.error,
      );
    }

    if (profilesResult.status === 'rejected') {
      this.logger.warn(
        `Failed to sync public.user_profiles is_onboarded for ${user.id}: ${String(profilesResult.reason)}`,
      );
    } else if (profilesResult.value.error) {
      this.logger.warn(
        `Failed to sync public.user_profiles is_onboarded for ${user.id}`,
        profilesResult.value.error,
      );
    }
  }

  async getProfile(userId: string) {
    // Используем централизованную fallback логику из репозитория
    const user = await this.userRepository.findById(userId);

    if (user) {
      await this.syncOnboardingFlagsIfNeeded(user);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        birthDate: this.formatBirthDate(user.birth_date),
        birthTime: user.birth_time,
        birthPlace: user.birth_place,
        onboardingCompleted: user.onboarding_completed === true,
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
          birthDate: this.formatBirthDate(created.birth_date),
          birthTime: created.birth_time,
          birthPlace: created.birth_place,
          onboardingCompleted: created.onboarding_completed === true,
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
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateExpoPushToken(userId: string, body: UpdatePushTokenDto) {
    const expoPushToken = String(body.expoPushToken || '').trim();
    if (!expoPushToken) {
      throw new BadRequestException('expoPushToken is required');
    }

    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { preferences: true },
    });

    const currentPreferences = this.asJsonObject(existingProfile?.preferences);
    const currentNotifications = this.asJsonObject(
      currentPreferences.notifications,
    );
    const previousTokens = this.normalizeExpoPushTokens(
      currentNotifications.expoPushTokens ?? currentNotifications.expoPushToken,
    );
    const enabled = body.enabled !== false;
    const nextTokens = enabled
      ? Array.from(new Set([...previousTokens, expoPushToken]))
      : previousTokens.filter((token) => token !== expoPushToken);

    const nextNotifications: Prisma.JsonObject = {
      ...currentNotifications,
      updatedAt: new Date().toISOString(),
    };

    if (body.platform) {
      nextNotifications.lastPlatform = body.platform;
    }

    if (nextTokens.length > 0) {
      nextNotifications.expoPushTokens = nextTokens;
      nextNotifications.expoPushToken = nextTokens[0];
    } else {
      delete nextNotifications.expoPushTokens;
      delete nextNotifications.expoPushToken;
    }

    const nextPreferences: Prisma.JsonObject = {
      ...currentPreferences,
      notifications: nextNotifications,
    };

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        preferences: nextPreferences,
      },
      create: {
        userId,
        preferences: nextPreferences,
      },
    });

    return {
      success: true,
      enabled: enabled && nextTokens.length > 0,
      tokenCount: nextTokens.length,
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
          tier: 'max',
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
      const birthDateOnly = this.formatBirthDate(
        profile?.birth_date ?? patch.birth_date,
      );
      const birthTime = (profile?.birth_time ?? patch.birth_time) as
        | string
        | undefined;
      const birthPlace = (profile?.birth_place ?? patch.birth_place) as
        | string
        | undefined;

      const hasAll = !!birthDateOnly && !!birthTime && !!birthPlace;

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
            birthDateOnly,
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
      birthDate: this.formatBirthDate(profile.birth_date),
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

      // Некоторые окружения могут быть “урезаны” (таблицы ещё не раскатаны миграциями).
      // Важно: любые ошибки SQL внутри транзакции Postgres «убивают» транзакцию целиком,
      // поэтому для опциональных таблиц сначала проверяем их наличие.
      const tableExists = async (table: string): Promise<boolean> => {
        const res = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(
          Prisma.sql`
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = ${table}
            ) AS "exists"
          `,
        );
        return Boolean(res?.[0]?.exists);
      };

      const columnExists = async (
        table: string,
        column: string,
      ): Promise<boolean> => {
        const res = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(
          Prisma.sql`
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = ${table}
                AND column_name = ${column}
            ) AS "exists"
          `,
        );
        return Boolean(res?.[0]?.exists);
      };

      const existingTables = {
        user_profiles: await tableExists('user_profiles'),
        user_photos: await tableExists('user_photos'),
        payments: await tableExists('payments'),
        feature_usage: await tableExists('feature_usage'),
        user_blocks: await tableExists('user_blocks'),
        user_reports: await tableExists('user_reports'),
        public_profiles: await tableExists('public_profiles'),
        profiles: await tableExists('profiles'),
      };

      const profileColumns = {
        public_profiles: existingTables.public_profiles
          ? {
              user_id: await columnExists('public_profiles', 'user_id'),
              id: await columnExists('public_profiles', 'id'),
            }
          : { user_id: false, id: false },
        profiles: existingTables.profiles
          ? {
              user_id: await columnExists('profiles', 'user_id'),
              id: await columnExists('profiles', 'id'),
            }
          : { user_id: false, id: false },
      };

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

        // 4.1 Удаляем профили и прочие «дочерние» записи, которые могут держать FK на public.users
        // Важно: в реальной БД constraint может называться исторически (например `public_profiles_user_id_fkey`)
        // даже если таблица/модель была переименована.

        if (existingTables.user_profiles) {
          this.logger.log(
            '🗑️ Удаление extended-профиля пользователя (user_profiles)...',
          );
          const userProfilesDeleted = await tx.userProfile.deleteMany({
            where: { userId },
          });
          this.logger.log(
            `✅ Удалено extended-профилей (user_profiles): ${userProfilesDeleted.count}`,
          );
        } else {
          this.logger.warn('⚠️ Таблица user_profiles не найдена — пропускаем');
        }

        if (existingTables.user_photos) {
          this.logger.log(
            '🗑️ Удаление фотографий пользователя (user_photos)...',
          );
          const photosDeleted = await tx.userPhoto.deleteMany({
            where: { userId },
          });
          this.logger.log(`✅ Удалено фотографий: ${photosDeleted.count}`);
        } else {
          this.logger.warn('⚠️ Таблица user_photos не найдена — пропускаем');
        }

        if (existingTables.payments) {
          this.logger.log('🗑️ Удаление платежей пользователя (payments)...');
          const paymentsDeleted = await tx.payment.deleteMany({
            where: { userId },
          });
          this.logger.log(`✅ Удалено платежей: ${paymentsDeleted.count}`);
        } else {
          this.logger.warn('⚠️ Таблица payments не найдена — пропускаем');
        }

        if (existingTables.feature_usage) {
          this.logger.log(
            '🗑️ Удаление usage-метрик пользователя (feature_usage)...',
          );
          const featureUsageDeleted = await tx.featureUsage.deleteMany({
            where: { userId },
          });
          this.logger.log(
            `✅ Удалено записей usage: ${featureUsageDeleted.count}`,
          );
        } else {
          this.logger.warn('⚠️ Таблица feature_usage не найдена — пропускаем');
        }

        // Блокировки/репорты могут ссылаться на пользователя с обеих сторон
        if (existingTables.user_blocks) {
          this.logger.log(
            '🗑️ Удаление блокировок пользователя (user_blocks)...',
          );
          const blocksDeleted = await tx.userBlock.deleteMany({
            where: {
              OR: [{ userId }, { blockedUserId: userId }],
            },
          });
          this.logger.log(`✅ Удалено блокировок: ${blocksDeleted.count}`);
        } else {
          this.logger.warn('⚠️ Таблица user_blocks не найдена — пропускаем');
        }

        if (existingTables.user_reports) {
          this.logger.log(
            '🗑️ Удаление репортов пользователя (user_reports)...',
          );
          const reportsDeleted = await tx.userReport.deleteMany({
            where: {
              OR: [{ reporterId: userId }, { reportedUserId: userId }],
            },
          });
          this.logger.log(`✅ Удалено репортов: ${reportsDeleted.count}`);
        } else {
          this.logger.warn('⚠️ Таблица user_reports не найдена — пропускаем');
        }

        // 4.2 Удаляем профили из таблиц, не описанных в Prisma (public_profiles / profiles)
        if (existingTables.public_profiles) {
          this.logger.log(
            '🗑️ Удаление профиля пользователя (public_profiles)...',
          );
          if (profileColumns.public_profiles.user_id) {
            await tx.$executeRaw(
              Prisma.sql`DELETE FROM public.public_profiles WHERE user_id = ${userId}::uuid`,
            );
          } else if (profileColumns.public_profiles.id) {
            await tx.$executeRaw(
              Prisma.sql`DELETE FROM public.public_profiles WHERE id = ${userId}::uuid`,
            );
          } else {
            this.logger.warn(
              '⚠️ Таблица public_profiles без колонок user_id/id — пропускаем',
            );
          }
        }

        if (existingTables.profiles) {
          this.logger.log('🗑️ Удаление профиля пользователя (profiles)...');
          if (profileColumns.profiles.user_id) {
            await tx.$executeRaw(
              Prisma.sql`DELETE FROM public.profiles WHERE user_id = ${userId}::uuid`,
            );
          } else if (profileColumns.profiles.id) {
            await tx.$executeRaw(
              Prisma.sql`DELETE FROM public.profiles WHERE id = ${userId}::uuid`,
            );
          } else {
            this.logger.warn(
              '⚠️ Таблица profiles без колонок user_id/id — пропускаем',
            );
          }
        }

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
