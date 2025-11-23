import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { logger } from '../../services/logger';

const { width } = Dimensions.get('window');

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName?: string;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onConfirm,
  userName = 'пользователь',
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');

  const warningScale = useSharedValue(1);
  const confirmButtonScale = useSharedValue(1);

  const warningAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: warningScale.value }],
  }));

  const confirmButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmButtonScale.value }],
  }));

  const handleClose = () => {
    if (!isDeleting) {
      setStep('warning');
      onClose();
    }
  };

  const handleProceedToConfirm = () => {
    warningScale.value = withSequence(
      withSpring(1.1, { damping: 8 }),
      withSpring(1)
    );
    setStep('confirm');
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      confirmButtonScale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      await onConfirm();
      setStep('warning');
    } catch (error) {
      logger.error('Error deleting account', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleButtonPressIn = (scaleValue: Animated.SharedValue<number>) => {
    scaleValue.value = withSpring(0.95);
  };

  const handleButtonPressOut = (scaleValue: Animated.SharedValue<number>) => {
    scaleValue.value = withSpring(1);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
            disabled={isDeleting}
          />
        </BlurView>

        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.duration(200)}
          style={styles.modalContainer}
        >
          {step === 'warning' ? (
            <LinearGradient
              colors={['rgba(30, 30, 46, 0.98)', 'rgba(17, 17, 27, 0.98)']}
              style={styles.modalContent}
            >
              <Animated.View
                style={[styles.iconContainer, warningAnimatedStyle]}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF5252']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="warning" size={48} color="#fff" />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.title}>Удалить аккаунт?</Text>
              <Text style={styles.userName}>{userName}</Text>

              <View style={styles.warningBox}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color="#FF6B6B"
                  style={styles.warningIcon}
                />
                <Text style={styles.warningText}>Это действие необратимо!</Text>
              </View>

              <View style={styles.deleteList}>
                <Text style={styles.deleteListTitle}>
                  Будут безвозвратно удалены:
                </Text>
                {[
                  { icon: 'person', text: 'Профиль и личные данные' },
                  { icon: 'planet', text: 'Натальная карта' },
                  { icon: 'people', text: 'Все связи и контакты' },
                  { icon: 'heart', text: 'Данные Dating' },
                  { icon: 'card', text: 'История подписок' },
                  { icon: 'analytics', text: 'Статистика и достижения' },
                ].map((item, index) => (
                  <View key={index} style={styles.deleteItem}>
                    <Ionicons
                      name={item.icon as any}
                      size={16}
                      color="#FF6B6B"
                    />
                    <Text style={styles.deleteItemText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[
                      'rgba(139, 92, 246, 0.2)',
                      'rgba(124, 58, 237, 0.2)',
                    ]}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="arrow-back" size={20} color="#8B5CF6" />
                    <Text style={styles.cancelButtonText}>Отмена</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.proceedButton}
                  onPress={handleProceedToConfirm}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF5252']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.proceedButtonText}>Продолжить</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['rgba(30, 30, 46, 0.98)', 'rgba(17, 17, 27, 0.98)']}
              style={styles.modalContent}
            >
              <Animated.View
                style={[styles.iconContainer, warningAnimatedStyle]}
              >
                <LinearGradient
                  colors={['#DC2626', '#B91C1C']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="skull" size={48} color="#fff" />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.title}>Последнее предупреждение</Text>

              <View style={[styles.warningBox, styles.criticalWarning]}>
                <Ionicons
                  name="nuclear"
                  size={24}
                  color="#DC2626"
                  style={styles.warningIcon}
                />
                <Text style={[styles.warningText, styles.criticalWarningText]}>
                  ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ{'\n'}НАВСЕГДА И БЕЗВОЗВРАТНО!
                </Text>
              </View>

              <Text style={styles.confirmQuestion}>
                Вы абсолютно уверены, что хотите удалить свой аккаунт?
              </Text>

              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { flex: 1 }]}
                  onPress={() => setStep('warning')}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[
                      'rgba(139, 92, 246, 0.3)',
                      'rgba(124, 58, 237, 0.3)',
                    ]}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="arrow-back" size={20} color="#8B5CF6" />
                    <Text style={styles.cancelButtonText}>Назад</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Animated.View
                  style={[{ flex: 1 }, confirmButtonAnimatedStyle]}
                >
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleConfirmDelete}
                    onPressIn={() => handleButtonPressIn(confirmButtonScale)}
                    onPressOut={() => handleButtonPressOut(confirmButtonScale)}
                    disabled={isDeleting}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#DC2626', '#B91C1C']}
                      style={styles.buttonGradient}
                    >
                      {isDeleting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash" size={20} color="#fff" />
                          <Text style={styles.deleteButtonText}>
                            Удалить навсегда
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </LinearGradient>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 20,
  },
  criticalWarning: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: 'rgba(220, 38, 38, 0.4)',
    padding: 16,
  },
  warningIcon: {
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  criticalWarningText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteList: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  deleteListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  deleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteItemText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
  },
  confirmQuestion: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  proceedButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  cancelButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeleteAccountModal;
