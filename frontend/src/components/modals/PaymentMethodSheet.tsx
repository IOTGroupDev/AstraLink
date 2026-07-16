import React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LoadingIndicator from '../shared/LoadingIndicator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export type PaywallPaymentMethod = 'stripe' | 'apple';

interface PaymentMethodSheetProps {
  visible: boolean;
  processing?: boolean;
  onClose: () => void;
  onSelect: (method: PaywallPaymentMethod) => void;
}

const PaymentMethodSheet: React.FC<PaymentMethodSheetProps> = ({
  visible,
  processing = false,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const hiddenSheetOffset = Math.max(windowHeight, 360);
  const [modalVisible, setModalVisible] = React.useState(visible);
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const sheetTranslateY = React.useRef(
    new Animated.Value(hiddenSheetOffset)
  ).current;
  const methods: Array<{
    key: PaywallPaymentMethod;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    disabled?: boolean;
  }> = [
    {
      key: 'stripe',
      icon: 'card-outline',
      title: t('subscription.paymentSheet.stripe.title', 'Pay by card'),
      subtitle: t(
        'subscription.paymentSheet.stripe.subtitle',
        'Secure card payment via Stripe'
      ),
    },
    ...(Platform.OS === 'ios'
      ? [
          {
            key: 'apple' as const,
            icon: 'logo-apple' as const,
            title: t('subscription.paymentSheet.apple.title', 'Apple Pay'),
            subtitle: t(
              'subscription.paymentSheet.apple.subtitle',
              'Native payment on iPhone'
            ),
            disabled: true,
          },
        ]
      : []),
  ];

  const closeWithAnimation = React.useCallback(
    (notifyParent: boolean) => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 130,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: hiddenSheetOffset,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        setModalVisible(false);
        if (notifyParent) {
          onClose();
        }
      });
    },
    [backdropOpacity, hiddenSheetOffset, onClose, sheetTranslateY]
  );

  React.useEffect(() => {
    if (visible) {
      backdropOpacity.stopAnimation();
      sheetTranslateY.stopAnimation();
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(hiddenSheetOffset);
      setModalVisible(true);
      return;
    }

    if (modalVisible) {
      closeWithAnimation(false);
    }
  }, [
    backdropOpacity,
    closeWithAnimation,
    hiddenSheetOffset,
    modalVisible,
    sheetTranslateY,
    visible,
  ]);

  React.useEffect(() => {
    if (!modalVisible || !visible) return;

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, modalVisible, sheetTranslateY, visible]);

  const handleClose = React.useCallback(() => {
    if (processing) return;
    closeWithAnimation(true);
  }, [closeWithAnimation, processing]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={processing ? undefined : handleClose}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, { opacity: backdropOpacity }]}
        />
        <Pressable
          disabled={processing}
          style={styles.dismissArea}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 18,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {t('subscription.paymentSheet.title', 'Choose payment method')}
              </Text>
              <Text style={styles.subtitle}>
                {t(
                  'subscription.paymentSheet.subtitle',
                  'Select how you want to activate Premium.'
                )}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={processing}
              onPress={handleClose}
              style={[styles.closeButton, processing && styles.disabled]}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.methods}>
            {methods.map((method) => (
              <TouchableOpacity
                key={method.key}
                activeOpacity={0.84}
                disabled={processing || method.disabled}
                onPress={() => {
                  if (!method.disabled) {
                    onSelect(method.key);
                  }
                }}
                style={[
                  styles.methodButton,
                  (processing || method.disabled) && styles.disabled,
                ]}
              >
                <View style={styles.methodIcon}>
                  <Ionicons name={method.icon} size={22} color="#FFFFFF" />
                </View>
                <View style={styles.methodText}>
                  <Text style={styles.methodTitle}>{method.title}</Text>
                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                </View>
                {processing && !method.disabled ? (
                  <LoadingIndicator size="small" />
                ) : method.disabled ? (
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="rgba(255, 255, 255, 0.54)"
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="rgba(255, 255, 255, 0.7)"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 14,
    lineHeight: 19,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  methods: {
    gap: 12,
    paddingTop: 20,
  },
  methodButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8D26A9',
  },
  methodText: {
    flex: 1,
  },
  methodTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  methodSubtitle: {
    marginTop: 3,
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 13,
    lineHeight: 17,
  },
  disabled: {
    opacity: 0.58,
  },
});

export default PaymentMethodSheet;
