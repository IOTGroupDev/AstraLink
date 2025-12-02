import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Subscription } from '../types';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface SubscriptionCardProps {
  subscription: Subscription | null;
  onUpgrade?: () => void;
  showUpgradeButton?: boolean;
}

const SUBSCRIPTION_LEVELS = {
  free: {
    color: '#6366F1',
    gradient: ['#4F46E5', '#6366F1'],
    icon: 'star-outline' as const,
  },
  basic: {
    color: '#8B5CF6',
    gradient: ['#7C3AED', '#8B5CF6'],
    icon: 'star' as const,
  },
  max: {
    color: '#F59E0B',
    gradient: ['#F59E0B', '#DC2626'],
    icon: 'diamond' as const,
  },
};

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onUpgrade,
  showUpgradeButton = true,
}) => {
  const { t, i18n } = useTranslation();
  const currentLevel = subscription?.tier || 'free';
  const levelConfig =
    SUBSCRIPTION_LEVELS[currentLevel] || SUBSCRIPTION_LEVELS.free;

  // Get translated tier name and features
  const tierName = t(`subscription.tiers.${currentLevel}.name`);
  const tierFeatures: string[] = t(
    `subscription.tiers.${currentLevel}.features`,
    { returnObjects: true }
  ) as string[];

  const formatExpiryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      i18n.language === 'ru'
        ? 'ru-RU'
        : i18n.language === 'es'
          ? 'es-ES'
          : 'en-US',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  };

  const endDateStr = subscription?.expiresAt || subscription?.trialEndsAt;
  const endDate = endDateStr ? new Date(endDateStr) : null;
  const isOnTrial = !!subscription?.isTrial && !!subscription?.trialEndsAt;
  const isExpired = endDate ? endDate < new Date() : false;

  const daysLeft = endDate
    ? Math.max(
        0,
        Math.ceil(
          (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const shouldShowUpgradeButton = showUpgradeButton && currentLevel !== 'max';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(17, 24, 39, 0.98)', 'rgba(31, 41, 55, 0.95)']}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={levelConfig.gradient}
              style={styles.badge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name={levelConfig.icon} size={16} color="#FFF" />
              <Text style={styles.badgeText}>{tierName}</Text>
            </LinearGradient>
          </View>

          {shouldShowUpgradeButton && onUpgrade && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={onUpgrade}
              activeOpacity={0.7}
            >
              <Text style={styles.upgradeText}>
                {t('subscription.buttons.upgrade')}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#8B5CF6" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status */}
        <View style={styles.statusSection}>
          {subscription?.tier === 'free' ? (
            <Text style={styles.statusText}>
              {t('subscription.status.freeAccount')}
            </Text>
          ) : (
            <>
              {isExpired ? (
                <View style={styles.expiredContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color="#EF4444"
                  />
                  <Text style={[styles.statusText, { color: '#EF4444' }]}>
                    {t('subscription.status.expired')}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.statusText}>
                    {t('subscription.status.validUntil', {
                      date: endDateStr ? formatExpiryDate(endDateStr) : '—',
                    })}
                  </Text>
                  {daysLeft <= 7 && endDateStr && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="time-outline" size={12} color="#F59E0B" />
                      <Text style={styles.warningText}>
                        {t('subscription.status.daysLeft', { count: daysLeft })}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {tierFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View
                style={[
                  styles.featureDot,
                  { backgroundColor: levelConfig.color },
                ]}
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Progress Bar */}
        {subscription?.tier !== 'free' && !isExpired && endDate && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(100, (daysLeft / 30) * 100)}%`,
                    backgroundColor: levelConfig.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {t('subscription.status.daysLeft', { count: daysLeft })}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

type SubscriptionScreenProps = StackScreenProps<
  RootStackParamList,
  'Subscription'
>;

function SubscriptionScreen(_: SubscriptionScreenProps) {
  // TODO: здесь можно подключить стор/запрос для получения текущей подписки пользователя
  // Пока безопасно показываем "free" состояние.
  const navigation = useNavigation();

  const handleUpgrade = () => {
    // заглушка: можно навигировать на экран апгрейда, когда появится
    // navigation.navigate('UpgradeSubscription' as never);
  };

  const mockSubscription: Subscription | null = {
    tier: 'free',
    isTrial: false,
    trialEndsAt: undefined as any,
    expiresAt: undefined as any,
  } as any;

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
      <SubscriptionCard
        subscription={mockSubscription}
        onUpgrade={handleUpgrade}
        showUpgradeButton
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 4,
  },
  upgradeText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
  },
  statusSection: {
    marginBottom: 16,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  featuresSection: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  featureText: {
    color: '#D1D5DB',
    fontSize: 13,
    flex: 1,
  },
  progressSection: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SubscriptionScreen;
