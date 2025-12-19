import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatingScreen from '../screens/DatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CosmicSimulatorScreen from '../screens/CosmicSimulatorScreen';
import AdvisorChatScreen from '../screens/AdvisorChatScreen';
import HoroscopeScreen from '../screens/HoroscopeScreen';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import ChatListScreen from '../screens/ChatListScreen';
import { useNavigation } from '@react-navigation/native';
import ProfileCompletionModal from '../components/modals/ProfileCompletionModal';
import { userAPI } from '../services/api/user.api';
import { userExtendedProfileAPI } from '../services/api/user-extended-profile.api';
import { calculateProfileCompletion } from '../screens/Auth/utils/onboardingutils';

const Tab = createBottomTabNavigator();
const PROFILE_COMPLETION_HIDE_KEY = 'profile_completion_hide_popup';

export default function TabNavigator() {
  const navigation = useNavigation<any>();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(100);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkProfileCompletion = async () => {
      try {
        const [profile, extendedProfile, hidePopup] = await Promise.all([
          userAPI.getProfile(),
          userExtendedProfileAPI.getUserProfile(),
          AsyncStorage.getItem(PROFILE_COMPLETION_HIDE_KEY),
        ]);

        const percent = calculateProfileCompletion(profile, extendedProfile);

        if (!isMounted) return;

        setCompletionPercent(percent);
        if (percent < 70 && !hidePopup) {
          setShowCompletionModal(true);
        }
      } catch {
        // Skip popup on fetch errors
      }
    };

    checkProfileCompletion();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistDontShow = async () => {
    if (!dontShowAgain) return;
    try {
      await AsyncStorage.setItem(PROFILE_COMPLETION_HIDE_KEY, 'true');
    } catch {
      // no-op
    }
  };

  const handleCloseModal = async () => {
    setShowCompletionModal(false);
    await persistDontShow();
  };

  const handleEditProfile = async () => {
    setShowCompletionModal(false);
    await persistDontShow();
    navigation.navigate('EditProfileScreen');
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // Плавная анимация переключения табов
          tabBarHideOnKeyboard: true,
          animation: 'shift',
          lazy: true,
          detachInactiveScreens: true,
          freezeOnBlur: true,
          tabBarIcon: ({ focused, color, size }) => {
            // Только outline-иконки + opacity (активная 1.0, неактивная 0.5)
            const style = { opacity: focused ? 1 : 0.5 };
            let name: keyof typeof Ionicons.glyphMap = 'ellipse-outline';

            if (route.name === 'Horoscope') {
              name = 'planet-outline';
            } else if (route.name === 'CosmicSimulator') {
              name = 'time-outline';
            } else if (route.name === 'Dating') {
              name = 'heart-outline';
            } else if (route.name === 'Advisor') {
              name = 'chatbubbles-outline';
            } else if (route.name === 'Messages') {
              name = 'chatbubbles-outline';
            } else if (route.name === 'Profile') {
              name = 'person-circle-outline';
            }

            // Добавляем красный бейдж "AI" для вкладки Советник (всегда отображается)
            if (route.name === 'Advisor') {
              const badgeSize = 16;
              return (
                <View
                  style={{
                    width: size,
                    height: size,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={name}
                    size={size}
                    color={color}
                    style={style}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -10,
                      minWidth: badgeSize,
                      height: badgeSize,
                      paddingHorizontal: 4,
                      borderRadius: badgeSize / 2,
                      backgroundColor: '#EF4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 9,
                        fontWeight: '700',
                        lineHeight: 10,
                      }}
                    >
                      AI
                    </Text>
                  </View>
                </View>
              );
            }

            return (
              <Ionicons name={name} size={size} color={color} style={style} />
            );
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#ffffff',
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 1,
            borderTopColor: 'rgba(139, 92, 246, 0.3)',
            paddingBottom: 50,
            paddingTop: 5,
            height: 108,
            backgroundColor: 'transparent', // важно для прозрачности
            bottom: -10, // опустили таббар на 10
          },
          tabBarBackground: () => (
            <BlurView
              intensity={50}
              tint="dark"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['rgba(167, 114, 181, 0.3)', 'rgba(26, 7, 31, 0.3)']}
                style={{ flex: 1 }}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
            </BlurView>
          ),
          headerStyle: {
            backgroundColor: 'transparent',
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerBackground: () => null,
        })}
      >
        <Tab.Screen
          name="Horoscope"
          component={HoroscopeScreen}
          options={{ title: 'Гороскоп', headerShown: false }}
        />
        <Tab.Screen
          name="CosmicSimulator"
          component={CosmicSimulatorScreen}
          options={{ title: 'Симулятор', headerShown: false }}
        />
        {/*<Tab.Screen*/}
        {/*  name="WelcomeScreen"*/}
        {/*  component={WelcomeScreen}*/}
        {/*  options={{ title: 'test', headerShown: false }}*/}
        {/*/>*/}
        <Tab.Screen
          name="Dating"
          component={DatingScreen}
          options={{ title: 'Dating', headerShown: false }}
        />
        <Tab.Screen
          name="Messages"
          component={ChatListScreen}
          options={{ title: 'Сообщения', headerShown: false }}
        />
        <Tab.Screen
          name="Advisor"
          component={AdvisorChatScreen}
          options={{ title: 'Советник', headerShown: false }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Профиль', headerShown: false }}
        />
        {/*<Tab.Screen*/}
        {/*  name="Clear"*/}
        {/*  component={ClearScreen}*/}
        {/*  options={{ title: 'Очистка', headerShown: false }}*/}
        {/*/>*/}
      </Tab.Navigator>
      <ProfileCompletionModal
        visible={showCompletionModal}
        completionPercent={completionPercent}
        dontShowAgain={dontShowAgain}
        onToggleDontShowAgain={() => setDontShowAgain((prev) => !prev)}
        onClose={handleCloseModal}
        onEditProfile={handleEditProfile}
      />
    </>
  );
}
