import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { userAPI } from '../services/api';
import { UserProfile, UpdateProfileRequest } from '../types';
import AstralInput from '../components/AstralInput';
import AstralDateTimePicker from '../components/DateTimePicker';
import CosmicBackground from '../components/CosmicBackground';
import LoadingLogo from '../components/LoadingLogo';

interface EditProfileScreenProps {
  navigation: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  navigation,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UpdateProfileRequest>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Анимационные значения для компонентов
  const animationValue = useSharedValue(1);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await userAPI.getProfile();
      setProfile(profileData);
      setFormData({
        name: profileData.name,
        birthDate: profileData.birthDate,
        birthTime: profileData.birthTime,
        birthPlace: profileData.birthPlace,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Валидация
      if (!formData.name?.trim()) {
        Alert.alert('Ошибка', 'Пожалуйста, введите имя');
        return;
      }

      if (!formData.birthDate) {
        Alert.alert('Ошибка', 'Пожалуйста, введите дату рождения');
        return;
      }

      await userAPI.updateProfile(formData);
      Alert.alert('Успех', 'Профиль обновлен', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <LoadingLogo />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Редактировать профиль</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Основная информация</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Имя</Text>
                <AstralInput
                  value={formData.name || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Введите ваше имя"
                  icon="person-outline"
                  animationValue={animationValue}
                />
              </View>

              <AstralDateTimePicker
                placeholder="Дата рождения"
                value={formData.birthDate || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, birthDate: text })
                }
                icon="calendar"
                mode="date"
                required
                animationValue={{ value: 1 }}
              />

              <AstralDateTimePicker
                placeholder="Время рождения"
                value={formData.birthTime || ''}
                onChangeText={(text) =>
                  setFormData({ ...formData, birthTime: text })
                }
                icon="time"
                mode="time"
                animationValue={{ value: 1 }}
              />

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Место рождения</Text>
                <AstralInput
                  value={formData.birthPlace || ''}
                  onChangeText={(text) =>
                    setFormData({ ...formData, birthPlace: text })
                  }
                  placeholder="Город, страна"
                  icon="location-outline"
                  animationValue={animationValue}
                />
              </View>
            </View>

            {/* Info Block */}
            <View style={styles.infoBlock}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#8B5CF6"
              />
              <Text style={styles.infoText}>
                Точные данные рождения необходимы для составления персональной
                натальной карты и расчета транзитов.
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={saving ? ['#666', '#555'] : ['#8B5CF6', '#7C3AED']}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <LoadingLogo />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Сохранить</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  placeholder: {
    width: 44,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
    textShadowColor: 'rgba(139, 92, 246, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  infoBlock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  infoText: {
    flex: 1,
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 10,
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default EditProfileScreen;
