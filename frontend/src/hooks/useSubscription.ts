// frontend/src/hooks/useSubscription.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionAPI } from '../services/api';
import {
  SubscriptionTier,
  Subscription,
  requiresTier,
  getRequiredTiers,
  FEATURE_REQUIREMENTS,
  TRIAL_CONFIG,
} from '../types/subscription';
import { logger } from '../services/logger';

/**
 * Главный хук для работы с подписками
 * Кеширует данные на 5 минут, автоматически обновляет при изменениях
 */
export const useSubscription = () => {
  const queryClient = useQueryClient();

  // Получение статуса подписки
  const {
    data: subscription,
    isLoading,
    error,
    refetch,
  } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: subscriptionAPI.getStatus,
    staleTime: 1000 * 60 * 5, // 5 минут кеш
    gcTime: 1000 * 60 * 30, // 30 минут в памяти
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Активация Trial
  const activateTrialMutation = useMutation({
    mutationFn: subscriptionAPI.activateTrial,
    onSuccess: () => {
      // Инвалидируем кеш, чтобы получить свежие данные
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // Upgrade подписки
  const upgradeMutation = useMutation({
    mutationFn: (data: { tier: SubscriptionTier; paymentMethod?: string }) =>
      subscriptionAPI.upgrade(data.tier, data.paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // Отмена подписки
  const cancelMutation = useMutation({
    mutationFn: subscriptionAPI.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Проверить, есть ли доступ к функции
   */
  const hasFeature = (feature: keyof typeof FEATURE_REQUIREMENTS): boolean => {
    if (!subscription?.isActive && !subscription?.isTrial) return false;

    const requiredTiers = getRequiredTiers(feature);
    if (requiredTiers.length === 0) return true; // Нет требований = доступно всем

    return requiredTiers.includes(subscription.tier);
  };

  /**
   * Проверить доступ по списку тиров
   */
  const hasTier = (requiredTiers: SubscriptionTier[]): boolean => {
    if (!subscription?.isActive && !subscription?.isTrial) return false;
    return requiredTiers.includes(subscription.tier);
  };

  /**
   * Текущий уровень подписки
   */
  const tier = subscription?.tier || SubscriptionTier.FREE;

  /**
   * Является ли подписка активной (включая Trial)
   */
  const isActive = subscription?.isActive || subscription?.isTrial || false;

  /**
   * Является ли подписка платной (Premium или MAX)
   */
  const isPremium = (): boolean => {
    return (
      isActive &&
      (tier === SubscriptionTier.PREMIUM || tier === SubscriptionTier.MAX)
    );
  };

  /**
   * Является ли подписка MAX
   */
  const isMax = (): boolean => {
    return isActive && tier === SubscriptionTier.MAX;
  };

  /**
   * Доступен ли Trial
   */
  const isTrialAvailable = (): boolean => {
    return TRIAL_CONFIG.enabled && !subscription?.trialEndsAt;
  };

  /**
   * Активен ли сейчас Trial
   */
  const isTrial = subscription?.isTrial || false;

  /**
   * Сколько дней осталось до конца подписки/trial
   */
  const daysRemaining = subscription?.daysRemaining;

  /**
   * Нужно ли показать предупреждение об истечении
   */
  const shouldShowExpirationWarning = (): boolean => {
    if (!daysRemaining || !isActive) return false;
    return daysRemaining <= 7; // Предупреждение за 7 дней
  };

  /**
   * Получить список функций текущей подписки
   */
  const features = subscription?.features || [];

  /**
   * Активировать Trial
   */
  const activateTrial = async () => {
    try {
      await activateTrialMutation.mutateAsync();
      return { success: true };
    } catch (error) {
      logger.error('Failed to activate trial', error);
      return { success: false, error };
    }
  };

  /**
   * Улучшить подписку (Mock платеж)
   */
  const upgrade = async (tier: SubscriptionTier, paymentMethod = 'mock') => {
    try {
      await upgradeMutation.mutateAsync({ tier, paymentMethod });
      return { success: true };
    } catch (error) {
      logger.error('Failed to upgrade', error);
      return { success: false, error };
    }
  };

  /**
   * Отменить подписку
   */
  const cancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel', error);
      return { success: false, error };
    }
  };

  /**
   * Получить минимальный тир для доступа к функции
   */
  const getMinimumTierForFeature = (
    feature: keyof typeof FEATURE_REQUIREMENTS
  ): SubscriptionTier | null => {
    const requiredTiers = getRequiredTiers(feature);
    if (requiredTiers.length === 0) return null;

    // Возвращаем самый дешевый тир
    if (requiredTiers.includes(SubscriptionTier.PREMIUM)) {
      return SubscriptionTier.PREMIUM;
    }
    return SubscriptionTier.MAX;
  };

  // ========================================
  // RETURN
  // ========================================
  return {
    // Data
    subscription,
    tier,
    isActive,
    isTrial,
    daysRemaining,
    features,

    // Loading states
    isLoading,
    error,

    // Checks
    hasFeature,
    hasTier,
    isPremium,
    isMax,
    isTrialAvailable,
    shouldShowExpirationWarning,
    getMinimumTierForFeature,

    // Actions
    activateTrial,
    upgrade,
    cancel,
    refetch,

    // Mutation states
    isActivatingTrial: activateTrialMutation.isPending,
    isUpgrading: upgradeMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
};

/**
 * Хук для быстрой проверки доступа к функции
 * @example
 * const canUseAI = useFeatureAccess('aiHoroscope');
 * if (!canUseAI) return <UpgradePrompt />;
 */
export const useFeatureAccess = (
  feature: keyof typeof FEATURE_REQUIREMENTS
): boolean => {
  const { hasFeature } = useSubscription();
  return hasFeature(feature);
};

/**
 * Хук для проверки доступа по тиру
 * @example
 * const canAccess = useTierAccess([SubscriptionTier.PREMIUM, SubscriptionTier.MAX]);
 */
export const useTierAccess = (requiredTiers: SubscriptionTier[]): boolean => {
  const { hasTier } = useSubscription();
  return hasTier(requiredTiers);
};
