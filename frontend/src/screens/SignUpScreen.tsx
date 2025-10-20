import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CosmicBackground from './CosmicBackground';

const SignUpScreen = () => {
  const router = useRouter();

  const handleEmailSignUp = () => {
    router.push('/signup-email');
  };

  const handleAppleSignUp = async () => {
    // TODO: Implement Apple sign up with Supabase
    console.log('Apple sign up');
  };

  const handleGoogleSignUp = async () => {
    // TODO: Implement Google sign up with Supabase
    console.log('Google sign up');
  };

  const handleVKSignUp = async () => {
    // TODO: Implement VK sign up
    console.log('VK sign up');
  };

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color="rgba(255, 255, 255, 0.7)"
              />
            </TouchableOpacity>

            <Text style={styles.title}>Регистрация</Text>

            <View style={styles.placeholder} />
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.subtitle}>
              Выберите способ{'\n'}авторизации
            </Text>

            <View style={styles.buttonsContainer}>
              {/* Email Button */}
              <TouchableOpacity
                style={styles.emailButton}
                onPress={handleEmailSignUp}
                activeOpacity={0.8}
              >
                <Text style={styles.emailButtonText}>через почту</Text>
              </TouchableOpacity>

              {/* Social Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignUp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-apple" size={32} color="#ECECEC" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleSignUp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={28} color="#ECECEC" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleVKSignUp}
                  activeOpacity={0.8}
                >
                  <View style={styles.vkIcon}>
                    <Text style={styles.vkText}>VK</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0618',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  placeholder: {
    width: 36,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  subtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 27,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  emailButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#ECECEC',
    borderRadius: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emailButtonText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: 60,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: '#ECECEC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  vkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vkText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#ECECEC',
  },
});

export default SignUpScreen;
