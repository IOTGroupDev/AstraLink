import React, { useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DatingScreen from '../screens/DatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdvisorChatScreen from '../screens/AdvisorChatScreen';
import HoroscopeScreen from '../screens/HoroscopeScreen';
import ChatListScreen from '../screens/ChatListScreen';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import ProfileCompletionModal from '../components/modals/ProfileCompletionModal';
import { userAPI } from '../services/api/user.api';
import { userExtendedProfileAPI } from '../services/api/user-extended-profile.api';
import { calculateProfileCompletion } from '../screens/Auth/utils/onboardingutils';
import { GradientBorderView } from '../components/shared';

const Tab = createBottomTabNavigator();
const PROFILE_COMPLETION_HIDE_KEY = 'profile_completion_hide_popup';
const ISLAND_SIDE_MARGIN = 16;
const TAB_BAR_BASE_HEIGHT = 64;

const TabBarIconWithBadge = React.memo(
  ({
    name,
    size,
    color,
    opacity,
  }: {
    name: keyof typeof Ionicons.glyphMap;
    size: number;
    color: string;
    opacity: number;
  }) => {
    const badgeSize = 16;

    return (
      <View style={styles.badgedIconWrap}>
        <Ionicons name={name} size={size} color={color} style={{ opacity }} />
        <View
          style={[styles.aiBadge, { minWidth: badgeSize, height: badgeSize }]}
        >
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>
    );
  }
);

const getIconName = (routeName: string): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Horoscope':
      return 'planet-outline';
    case 'Dating':
      return 'heart-outline';
    case 'Advisor':
    case 'Messages':
      return 'chatbubbles-outline';
    case 'Profile':
      return 'person-circle-outline';
    default:
      return 'ellipse-outline';
  }
};

const TabBarBackground = React.memo(() => (
  <View pointerEvents="none" style={styles.tabBarShell}>
    <BlurView
      intensity={28}
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.tabBarTint} />
    <GradientBorderView
      colors={['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.025)']}
      gradientProps={{
        locations: [0.29, 1],
        start: { x: 0.49, y: 0 },
        end: { x: 0.51, y: 1 },
      }}
      style={styles.tabBarBorder}
    />
  </View>
));

export default function TabNavigator() {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const barBottomOffset = Math.max(8, Math.round(insets.bottom * 0.5) + 6);
  const barVerticalInset = 8;

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionPercent, setCompletionPercent] = useState(100);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const tabBarHeight = TAB_BAR_BASE_HEIGHT;

  const tabLabels = useMemo(
    () => ({
      horoscope: t('common.tabs.horoscope'),
      dating: t('common.tabs.dating'),
      messages: t('common.tabs.messages'),
      advisor: t('common.tabs.advisor'),
      profile: t('common.tabs.profile'),
    }),
    [i18n.language, t]
  );

  useEffect(() => {
    let isMounted = true;
    let interactionTask: { cancel?: () => void } | null = null;

    const checkProfileCompletion = async () => {
      try {
        const hidePopup = await AsyncStorage.getItem(
          PROFILE_COMPLETION_HIDE_KEY
        );
        if (hidePopup || !isMounted) {
          return;
        }

        const [profile, extendedProfile] = await Promise.all([
          userAPI.getProfile(),
          userExtendedProfileAPI.getUserProfile(),
        ]);

        const percent = calculateProfileCompletion(profile, extendedProfile);

        if (!isMounted) return;

        setCompletionPercent(percent);
        if (percent < 70) {
          setShowCompletionModal(true);
        }
      } catch {
        // Skip popup on fetch errors
      }
    };

    interactionTask = InteractionManager.runAfterInteractions(() => {
      void checkProfileCompletion();
    });

    return () => {
      isMounted = false;
      interactionTask?.cancel?.();
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

  const screenOptions = useMemo(
    () => ({
      tabBarHideOnKeyboard: true,
      animation: 'none' as const,
      lazy: true,
      lazyPreloadDistance: 0,
      detachInactiveScreens: true,
      freezeOnBlur: true,
      sceneContainerStyle: {
        backgroundColor: '#080E1C',
      },
      tabBarActiveTintColor: '#F8FAFC',
      tabBarInactiveTintColor: 'rgba(226, 232, 240, 0.54)',
      tabBarShowLabel: true,
      tabBarStyle: {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        marginHorizontal: ISLAND_SIDE_MARGIN,
        bottom: barBottomOffset,
        height: tabBarHeight,
        paddingTop: 5.2,
        paddingBottom: barVerticalInset,
        paddingHorizontal: 6.5,
        borderTopWidth: 0,
        borderRadius: 999,
        backgroundColor: 'transparent',
        elevation: 18,
        shadowColor: '#020617',
        shadowOpacity: 0.28,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        overflow: 'hidden' as const,
      },
      tabBarItemStyle: {
        marginHorizontal: 0,
        borderRadius: 999,
      },
      tabBarLabelStyle: {
        fontSize: 9.5,
        fontWeight: '600' as const,
        paddingBottom: 1,
      },
      tabBarIconStyle: {
        marginTop: 1,
      },
      tabBarBackground: () => <TabBarBackground />,
      headerStyle: {
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold' as const,
        fontSize: 18,
      },
      headerBackground: () => null,
    }),
    [barBottomOffset, i18n.language, tabBarHeight]
  );

  const renderTabBarIcon = useMemo(
    () =>
      ({ route }: { route: { name: string } }) =>
      ({
        focused,
        color,
        size,
      }: {
        focused: boolean;
        color: string;
        size: number;
      }) => {
        const opacity = focused ? 1 : 0.9;
        const name = getIconName(route.name);
        const iconSize = focused ? size : size - 1;

        if (route.name === 'Advisor') {
          return (
            <TabBarIconWithBadge
              name={name}
              size={iconSize}
              color={color}
              opacity={opacity}
            />
          );
        }

        return (
          <Ionicons
            name={name}
            size={iconSize}
            color={color}
            style={{ opacity }}
          />
        );
      },
    []
  );

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          ...screenOptions,
          tabBarIcon: renderTabBarIcon({ route }),
        })}
      >
        <Tab.Screen
          name="Horoscope"
          component={HoroscopeScreen}
          options={{
            title: tabLabels.horoscope,
            tabBarLabel: tabLabels.horoscope,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Dating"
          component={DatingScreen}
          options={{
            title: tabLabels.dating,
            tabBarLabel: tabLabels.dating,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Messages"
          component={ChatListScreen}
          options={{
            title: tabLabels.messages,
            tabBarLabel: tabLabels.messages,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Advisor"
          component={AdvisorChatScreen}
          options={{
            title: tabLabels.advisor,
            tabBarLabel: tabLabels.advisor,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: tabLabels.profile,
            tabBarLabel: tabLabels.profile,
            headerShown: false,
          }}
        />
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

const styles = StyleSheet.create({
  badgedIconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: -3,
    right: -11,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 10,
  },
  tabBarShell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabBarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 999,
  },
  tabBarTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(32, 28, 55, 0.5)',
  },
});
