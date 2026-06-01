import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useSubscription } from '../hooks/useSubscription';
import FullscreenLoadingScreen from '../components/shared/FullscreenLoadingScreen';
import paywallBackground from '@assets/loading-bg.png';
import premiumHero from '@assets/premium-hero.png';

type ManageSubscriptionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ManageSubscription'
>;

const BASE_CONTENT_HEIGHT = 730;
const CANCELLED_PERIOD_KEY_PREFIX = '@astralink/subscription/cancelled-period:';

function ManageSubscriptionScreen({
  navigation,
}: ManageSubscriptionScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { subscription, cancel, isCancelling, isLoading, refetch } =
    useSubscription();
  const [isCancellationScheduled, setIsCancellationScheduled] =
    React.useState(false);
  const subscriptionPeriod =
    subscription?.expiresAt || subscription?.trialEndsAt || null;
  const cancelledPeriodKey = subscription?.userId
    ? `${CANCELLED_PERIOD_KEY_PREFIX}${subscription.userId}`
    : null;
  const availableContentHeight = screenHeight - insets.top - insets.bottom;
  const layoutScale = Math.min(1, availableContentHeight / BASE_CONTENT_HEIGHT);
  const scaled = React.useCallback(
    (value: number) => Math.round(value * layoutScale),
    [layoutScale]
  );
  const daysLeft =
    typeof subscription?.daysRemaining === 'number'
      ? Math.max(0, Math.ceil(subscription.daysRemaining))
      : null;

  React.useEffect(() => {
    let isMounted = true;

    if (!cancelledPeriodKey || !subscriptionPeriod) {
      setIsCancellationScheduled(false);
      return () => {
        isMounted = false;
      };
    }

    void (async () => {
      try {
        const storedPeriod = await AsyncStorage.getItem(cancelledPeriodKey);
        if (!isMounted) return;

        const isCurrentCancelledPeriod = storedPeriod === subscriptionPeriod;
        setIsCancellationScheduled(isCurrentCancelledPeriod);

        if (storedPeriod && !isCurrentCancelledPeriod) {
          await AsyncStorage.removeItem(cancelledPeriodKey);
        }
      } catch {
        if (isMounted) {
          setIsCancellationScheduled(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [cancelledPeriodKey, subscriptionPeriod]);

  const retainedBenefits = [
    {
      icon: 'sparkles-outline' as const,
      label: t('subscription.management.benefits.ai', 'Personal AI horoscopes'),
    },
    {
      icon: 'planet-outline' as const,
      label: t(
        'subscription.management.benefits.chart',
        'Full natal chart interpretation'
      ),
    },
    {
      icon: 'chatbubble-outline' as const,
      label: t(
        'subscription.management.benefits.advisor',
        'Advisor AI analysis'
      ),
    },
  ];

  const confirmCancellation = React.useCallback(() => {
    Alert.alert(
      t('subscription.management.confirmTitle', 'Cancel Premium?'),
      t(
        'subscription.management.confirmMessage',
        'Your Premium access stays available until the end of the current period.'
      ),
      [
        {
          text: t('subscription.management.keep', 'Keep Premium'),
          style: 'cancel',
        },
        {
          text: t(
            'subscription.management.cancelAction',
            'Cancel subscription'
          ),
          style: 'destructive',
          onPress: async () => {
            const result = await cancel();

            if (!result.success) {
              Alert.alert(
                t('common.errors.generic', 'Error'),
                t(
                  'subscription.management.error',
                  'Failed to cancel subscription. Please try again.'
                )
              );
              return;
            }

            await refetch();
            setIsCancellationScheduled(true);
            if (cancelledPeriodKey && subscriptionPeriod) {
              void AsyncStorage.setItem(
                cancelledPeriodKey,
                subscriptionPeriod
              ).catch(() => undefined);
            }
            Alert.alert(
              t('subscription.management.successTitle', 'Cancelled'),
              t(
                'subscription.management.successMessage',
                'Premium will remain active until the end of your paid period.'
              )
            );
          },
        },
      ]
    );
  }, [cancel, cancelledPeriodKey, refetch, subscriptionPeriod, t]);

  if (isLoading) {
    return <FullscreenLoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.backgroundFrame}>
        <ImageBackground
          source={paywallBackground}
          resizeMode="cover"
          imageStyle={styles.backgroundImage}
          style={styles.background}
        />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.buttons.close', 'Close')}
        activeOpacity={0.8}
        disabled={isCancelling}
        onPress={() => navigation.goBack()}
        style={[
          styles.closeButton,
          {
            top: insets.top + scaled(6),
            width: scaled(46),
            height: scaled(46),
          },
          isCancelling && styles.disabled,
        ]}
      >
        <Ionicons
          name="close-outline"
          size={scaled(34)}
          color="rgba(255, 255, 255, 0.32)"
        />
      </TouchableOpacity>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + scaled(20),
            paddingBottom: insets.bottom + scaled(18),
            paddingHorizontal: scaled(24),
          },
        ]}
      >
        <View style={[styles.hero, { gap: scaled(8) }]}>
          <Image
            source={premiumHero}
            resizeMode="contain"
            style={{ width: scaled(127), height: scaled(101) }}
          />
          <Text
            style={[
              styles.title,
              { fontSize: scaled(27), lineHeight: scaled(30) },
            ]}
          >
            {t('subscription.management.title', 'Your Premium\nsubscription')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { fontSize: scaled(15), lineHeight: scaled(20) },
            ]}
          >
            {isCancellationScheduled
              ? t(
                  'subscription.management.cancelledDescription',
                  'Cancellation scheduled. Your access stays active until the period ends.'
                )
              : t(
                  'subscription.management.description',
                  'Manage your plan and Premium access.'
                )}
          </Text>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              borderRadius: scaled(12),
              marginTop: scaled(30),
              paddingHorizontal: scaled(18),
              paddingVertical: scaled(14),
            },
          ]}
        >
          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusTitle,
                { fontSize: scaled(18), lineHeight: scaled(22) },
              ]}
            >
              Premium
            </Text>
            <Text
              style={[
                styles.statusBadge,
                { fontSize: scaled(12), lineHeight: scaled(16) },
              ]}
            >
              {isCancellationScheduled
                ? t('subscription.management.cancelling', 'Ends soon')
                : t('subscription.status.active', 'Active')}
            </Text>
          </View>
          {daysLeft !== null && (
            <Text
              style={[
                styles.daysText,
                { fontSize: scaled(14), lineHeight: scaled(19) },
              ]}
            >
              {t('subscription.status.daysLeft', { count: daysLeft })}
            </Text>
          )}
        </View>

        <View
          style={[styles.benefits, { gap: scaled(18), marginTop: scaled(28) }]}
        >
          {retainedBenefits.map((benefit) => (
            <View
              key={benefit.label}
              style={[styles.benefitRow, { gap: scaled(16) }]}
            >
              <Ionicons name={benefit.icon} size={scaled(25)} color="#FFFFFF" />
              <Text
                style={[
                  styles.benefitText,
                  { fontSize: scaled(15), lineHeight: scaled(20) },
                ]}
              >
                {benefit.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.actions, { gap: scaled(14) }]}>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={isCancelling}
            onPress={() => navigation.goBack()}
            style={[
              styles.primaryButton,
              {
                height: scaled(58),
                borderRadius: scaled(58),
              },
              isCancelling && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { fontSize: scaled(17), lineHeight: scaled(22) },
              ]}
            >
              {t('subscription.management.keep', 'Keep Premium')}
            </Text>
          </TouchableOpacity>

          {!isCancellationScheduled && (
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isCancelling}
              onPress={confirmCancellation}
              style={styles.cancelButton}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { fontSize: scaled(14), lineHeight: scaled(19) },
                ]}
              >
                {isCancelling
                  ? t('subscription.management.cancellingNow', 'Cancelling...')
                  : t(
                      'subscription.management.cancelAction',
                      'Cancel subscription'
                    )}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[styles.legal, { gap: scaled(14), marginTop: scaled(32) }]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[
              styles.legalText,
              { fontSize: scaled(10), lineHeight: scaled(14) },
            ]}
          >
            {t('subscription.paywall.terms', 'Terms and Conditions')}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[
              styles.legalText,
              { fontSize: scaled(10), lineHeight: scaled(14) },
            ]}
          >
            {t('subscription.paywall.privacy', 'Privacy Policy')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  backgroundFrame: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ rotate: '180deg' }],
  },
  background: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  backgroundImage: {
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 300,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
  statusCard: {
    width: '100%',
    backgroundColor: 'rgba(87, 53, 205, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.7)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
  },
  statusBadge: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
  },
  daysText: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.58)',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
  },
  benefits: {
    width: '100%',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
  },
  actions: {
    marginTop: 'auto',
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#8D26A9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
  },
  legal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default ManageSubscriptionScreen;
