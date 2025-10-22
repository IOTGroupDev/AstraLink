import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../stores/auth.store';
import { authAPI, userAPI } from '../services/api';
import { tokenService } from '../services/tokenService';
import CosmicBackground from '../components/CosmicBackground';

// Define your navigation type
type RootStackParamList = {
  MainTabs: undefined;
  SignUp: undefined;
  Login: undefined;
  welcome: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const {
    biometricEnabled,
    biometricAvailable,
    biometricType,
    rememberMe,
    setUser,
    setRememberMe,
    checkBiometricSupport,
    authenticateWithBiometrics,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    const checkBiometric = async () => {
      const token = await tokenService.getToken();
      if (biometricAvailable && biometricEnabled && token) {
        setShowBiometricButton(true);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const success = await authenticateWithBiometrics();

      if (success) {
        const token = await tokenService.getToken();
        if (token) {
          try {
            const user = await userAPI.getProfile();
            setUser(user);
            // Navigate to main app instead of callback
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось восстановить сессию');
          }
        }
      } else {
        Alert.alert('Ошибка', 'Биометрическая аутентификация не удалась');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: email.trim().toLowerCase(),
        password,
      });

      setUser(response.user);
      console.log('✅ Успешный вход');

      // Navigate to main app instead of callback
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Ошибка входа', error.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToSignup = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <CosmicBackground />
      <View style={styles.content}>
        <Text style={styles.title}>Вход</Text>

        {/* Биометрия (если доступна) */}
        {showBiometricButton && (
          <>
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Ionicons name="finger-print" size={28} color="#fff" />
              <Text style={styles.biometricText}>Войти с {biometricType}</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        {/* Email */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="rgba(255,255,255,0.5)"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        {/* Пароль */}
        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="rgba(255,255,255,0.5)"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="rgba(255,255,255,0.5)"
            />
          </TouchableOpacity>
        </View>

        {/* Чекбокс "Запомнить меня" */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setRememberMe(!rememberMe)}
          disabled={loading}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Ionicons name="checkmark" size={16} color="#000" />}
          </View>
          <Text style={styles.checkboxText}>Запомнить меня</Text>
        </TouchableOpacity>

        {/* Кнопка входа */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.loginButtonText}>Войти</Text>
          )}
        </TouchableOpacity>

        {/* Регистрация */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Нет аккаунта? </Text>
          <TouchableOpacity onPress={handleSwitchToSignup} disabled={loading}>
            <Text style={styles.signupLink}>Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Montserrat-SemiBold',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    height: 60,
    marginBottom: 16,
    gap: 12,
  },
  biometricText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Montserrat-Medium',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 16,
    fontFamily: 'Montserrat-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
  eyeIcon: {
    padding: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  checkboxText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  signupLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: 'Montserrat-SemiBold',
  },
});
