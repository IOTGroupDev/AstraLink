import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import premiumHero from '@assets/premium-hero.png';

interface SubscriptionRequiredModalProps {
  visible: boolean;
  description?: string;
  processing?: boolean;
  onContinue: () => void;
  onClose: () => void;
}

const BASE_CONTENT_HEIGHT = 640;

const SubscriptionRequiredModal: React.FC<SubscriptionRequiredModalProps> = ({
  visible,
  description,
  processing = false,
  onContinue,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const availableHeight = screenHeight - insets.top - insets.bottom;
  const layoutScale = Math.min(1, availableHeight / BASE_CONTENT_HEIGHT);
  const scaled = React.useCallback(
    (value: number) => Math.round(value * layoutScale),
    [layoutScale]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={processing ? undefined : onClose}
    >
      <View style={styles.screen}>
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.scrim} />

        <View
          pointerEvents="box-none"
          style={[
            styles.content,
            {
              paddingTop: insets.top + scaled(10),
              paddingBottom: insets.bottom + scaled(10),
              paddingHorizontal: scaled(24),
            },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('common.buttons.close', 'Close')}
            activeOpacity={0.8}
            disabled={processing}
            onPress={onClose}
            style={[
              styles.closeButton,
              {
                top: insets.top + scaled(6),
                width: scaled(46),
                height: scaled(46),
              },
              processing && styles.closeButtonDisabled,
            ]}
          >
            <Ionicons
              name="close-outline"
              size={scaled(34)}
              color="rgba(255, 255, 255, 0.32)"
            />
          </TouchableOpacity>

          <View
            pointerEvents="box-none"
            style={[styles.center, { gap: scaled(40) }]}
          >
            <Pressable
              accessible={false}
              style={[styles.hero, { gap: scaled(16) }]}
              onPress={() => undefined}
            >
              <Image
                source={premiumHero}
                resizeMode="contain"
                style={{ width: scaled(127), height: scaled(101) }}
              />
              <Text
                style={[
                  styles.title,
                  { fontSize: scaled(26), lineHeight: scaled(26) },
                ]}
              >
                {t('subscription.gate.title', 'Subscription\nRequired')}
              </Text>
              <Text
                style={[
                  styles.description,
                  { fontSize: scaled(16), lineHeight: scaled(16) },
                ]}
              >
                {description ??
                  t(
                    'subscription.gate.description',
                    'Subscribe to view\nthe AI analysis'
                  )}
              </Text>
            </Pressable>

            <Pressable
              accessible={false}
              style={[styles.actions, { gap: scaled(14) }]}
              onPress={() => undefined}
            >
              <Text
                style={[
                  styles.pricing,
                  { fontSize: scaled(16), lineHeight: scaled(16) },
                ]}
              >
                {t(
                  'subscription.paywall.pricing',
                  '3 days free, then $9.99/mo'
                )}
              </Text>
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={processing}
                style={[
                  styles.continueButton,
                  {
                    height: scaled(60),
                    borderRadius: scaled(58),
                    paddingHorizontal: scaled(28),
                  },
                  processing && styles.continueButtonDisabled,
                ]}
                onPress={onContinue}
              >
                <Text
                  style={[
                    styles.continueText,
                    { fontSize: scaled(16), lineHeight: scaled(19) },
                  ]}
                >
                  {processing
                    ? t('subscription.purchasing', 'Processing...')
                    : t('subscription.paywall.continue', 'Continue')}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.cancel,
                  { fontSize: scaled(16), lineHeight: scaled(16) },
                ]}
              >
                {t('subscription.paywall.cancel', 'Cancel anytime')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessible={false}
            onPress={() => undefined}
            style={[
              styles.legal,
              {
                bottom: insets.bottom + scaled(30),
                gap: scaled(24),
              },
            ]}
          >
            <Text
              style={[
                styles.legalText,
                { fontSize: scaled(11), lineHeight: scaled(14) },
              ]}
            >
              {t('subscription.paywall.terms', 'Terms and Conditions')}
            </Text>
            <Text
              style={[
                styles.legalText,
                { fontSize: scaled(11), lineHeight: scaled(14) },
              ]}
            >
              {t('subscription.paywall.privacy', 'Privacy Policy')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.45,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    width: '100%',
  },
  pricing: {
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    paddingVertical: 10,
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#8D26A9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  cancel: {
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    paddingVertical: 10,
  },
  legal: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalText: {
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default SubscriptionRequiredModal;
