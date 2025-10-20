import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import CosmicBackground from '../components/CosmicBackground';
import HoroscopeSvg from '../components/svg/tabs/HoroscopeSvg';

// Иконки для навигации (упрощенные SVG в виде компонентов)
const NatalIcon = ({ color = '#FFFFFF' }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.natalCircle, { borderColor: color }]} />
  </View>
);

const SimulateIcon = ({ color = '#FFFFFF' }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.simulateBase, { borderColor: color }]} />
    <View style={[styles.simulateDot, { backgroundColor: color }]} />
  </View>
);

const DatingIcon = ({ color = '#FFFFFF' }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.heartLeft, { borderColor: color }]} />
    <View style={[styles.heartRight, { borderColor: color }]} />
  </View>
);

const ChatIcon = ({ color = '#FFFFFF' }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.chatBubble, { borderColor: color }]} />
    <View style={[styles.chatBubbleSmall, { borderColor: color }]} />
  </View>
);

const ProfileIcon = ({ color = '#FFFFFF' }) => (
  <View style={styles.iconContainer}>
    <View style={[styles.profileCircle, { borderColor: color }]} />
    <View style={[styles.profileBody, { borderColor: color }]} />
  </View>
);

const HoroscopeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const tabs = [
    { id: 0, label: 'Гороскоп', icon: NatalIcon },
    { id: 1, label: 'Симулятор', icon: SimulateIcon },
    { id: 2, label: 'Знакомства', icon: DatingIcon },
    { id: 3, label: 'Советник', icon: ChatIcon },
    { id: 4, label: 'Профиль', icon: ProfileIcon },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CosmicBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Заголовок с размытием */}
          <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
            <View style={styles.headerIconContainer}>
              <HoroscopeSvg width={60} height={60} />
            </View>
            <Text style={styles.headerTitle}>Гороскоп</Text>
            <Text style={styles.headerSubtitle}>Астрологический дашборд</Text>
            <Text style={styles.headerDate}>Позиции на 12 октября 2025</Text>
          </BlurView>

          {/* Основной контент */}
          <View style={styles.contentContainer}>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                Здесь будет ваш персональный гороскоп
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Нижняя размытая панель */}
        <View style={styles.bottomGradient} />

        {/* Навигационная панель */}
        <BlurView intensity={30} tint="dark" style={styles.navigationContainer}>
          <View style={styles.navigationContent}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabButton}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
                  />
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>

        {/* Home Indicator */}
        <View style={styles.homeIndicator} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 140,
  },
  // Заголовок
  headerContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3.75,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  headerDate: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  // Контент
  contentContainer: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  placeholder: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  // Нижний градиент
  bottomGradient: {
    position: 'absolute',
    bottom: 108,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
  // Навигация
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(117, 70, 131, 0.5)',
    overflow: 'hidden',
    paddingBottom: 20,
  },
  navigationContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
  },
  tabLabel: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -70,
    width: 140,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  // Иконки
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Natal Icon
  natalCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  // Simulate Icon
  simulateBase: {
    width: 18,
    height: 26,
    borderRadius: 4,
    borderWidth: 2,
  },
  simulateDot: {
    position: 'absolute',
    width: 13,
    height: 18,
    borderRadius: 2,
  },
  // Dating Icon (Heart)
  heartLeft: {
    position: 'absolute',
    width: 13,
    height: 12,
    borderRadius: 12,
    borderWidth: 2,
    left: 5,
    top: 8,
    transform: [{ rotate: '-45deg' }],
  },
  heartRight: {
    position: 'absolute',
    width: 13,
    height: 12,
    borderRadius: 12,
    borderWidth: 2,
    right: 5,
    top: 8,
    transform: [{ rotate: '45deg' }],
  },
  // Chat Icon
  chatBubble: {
    width: 22,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    position: 'absolute',
    top: 3,
    right: 3,
  },
  chatBubbleSmall: {
    width: 15,
    height: 14,
    borderRadius: 8,
    borderWidth: 2,
    position: 'absolute',
    bottom: 5,
    left: 5,
  },
  // Profile Icon
  profileCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    position: 'absolute',
    top: 3,
  },
  profileBody: {
    width: 8.5,
    height: 9,
    borderRadius: 4,
    borderWidth: 2,
    position: 'absolute',
    bottom: 9,
  },
});

export default HoroscopeScreen;
