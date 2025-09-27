import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AstralInput from './AstralInput';
import AstralDateTimePicker from './DateTimePicker';

interface AddConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (connection: any) => void;
}

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Анимации для полей ввода
  const fieldAnimations = {
    name: useSharedValue(0),
    birthDate: useSharedValue(0),
    birthTime: useSharedValue(0),
    birthPlace: useSharedValue(0),
  };

  useEffect(() => {
    if (visible) {
      // Анимация появления полей
      fieldAnimations.name.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 100 })
      );
      fieldAnimations.birthDate.value = withDelay(
        400,
        withSpring(1, { damping: 8, stiffness: 100 })
      );
      fieldAnimations.birthTime.value = withDelay(
        600,
        withSpring(1, { damping: 8, stiffness: 100 })
      );
      fieldAnimations.birthPlace.value = withDelay(
        800,
        withSpring(1, { damping: 8, stiffness: 100 })
      );
    } else {
      // Сброс анимаций при закрытии
      Object.values(fieldAnimations).forEach((animation) => {
        animation.value = 0;
      });
    }
  }, [visible]);

  const handleAdd = async () => {
    if (!formData.name || !formData.birthDate) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    setLoading(true);
    try {
      // Здесь будет API вызов
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Имитация загрузки

      onAdd(formData);
      setFormData({ name: '', birthDate: '', birthTime: '', birthPlace: '' });
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить связь');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.95)']}
        style={styles.background}
      >
        <Animated.View entering={FadeIn.delay(200)} style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Добавить связь</Text>
            <Text style={styles.subtitle}>
              Создайте новую астрологическую связь
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Form */}
            <Animated.View entering={SlideInUp.delay(400)} style={styles.form}>
              <AstralInput
                placeholder="Имя"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                icon="person"
                required
                animationValue={fieldAnimations.name}
                isFocused={focusedField === 'name'}
              />

              <AstralDateTimePicker
                placeholder="Дата рождения"
                value={formData.birthDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, birthDate: text })
                }
                icon="calendar"
                mode="date"
                required
                animationValue={fieldAnimations.birthDate}
              />

              <AstralDateTimePicker
                placeholder="Время рождения"
                value={formData.birthTime}
                onChangeText={(text) =>
                  setFormData({ ...formData, birthTime: text })
                }
                icon="time"
                mode="time"
                animationValue={fieldAnimations.birthTime}
                isFocused={focusedField === 'birthTime'}
              />

              <AstralInput
                placeholder="Место рождения"
                value={formData.birthPlace}
                onChangeText={(text) =>
                  setFormData({ ...formData, birthPlace: text })
                }
                onFocus={() => setFocusedField('birthPlace')}
                onBlur={() => setFocusedField(null)}
                icon="location"
                animationValue={fieldAnimations.birthPlace}
                isFocused={focusedField === 'birthPlace'}
              />

              {/* Submit Button */}
              <Animated.View
                entering={SlideInUp.delay(1000)}
                style={styles.buttonContainer}
              >
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleAdd}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#3B82F6', '#1E40AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <Ionicons name="hourglass" size={20} color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="add-circle"
                          size={20}
                          color="#fff"
                          style={styles.buttonIcon}
                        />
                        <Text style={styles.buttonText}>Добавить связь</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    lineHeight: 22,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AddConnectionModal;
