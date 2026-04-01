import React, { useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DatingScreen from '../screens/DatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
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
    <LinearGradient
      colors={[
        'rgba(226, 203, 255, 0.28)',
        'rgba(168, 120, 255, 0.2)',
        'rgba(255,255,255,0.08)',
      ]}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.92, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <BlurView intensity={28} tint="dark" style={styles.tabBarBlur} />
    <LinearGradient
      colors={[
        'rgba(36, 29, 58, 0.9)',
        'rgba(34, 28, 55, 0.9)',
        'rgba(31, 27, 50, 0.9)',
      ]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.tabBarFill}
    />
    <LinearGradient
      pointerEvents="none"
      colors={[
        'rgba(247, 240, 255, 0)',
        'rgba(236, 223, 255, 0.22)',
        'rgba(210, 178, 255, 0.42)',
        'rgba(236, 223, 255, 0.22)',
        'rgba(247, 240, 255, 0)',
      ]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.tabBarTopBorder}
    />
    <LinearGradient
      pointerEvents="none"
      colors={[
        'rgba(255,255,255,0.08)',
        'rgba(196, 168, 255, 0.04)',
        'rgba(255,255,255,0)',
      ]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.tabBarHighlight}
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

  const screenOptions = useMemo(
    () => ({
      tabBarHideOnKeyboard: true,
      animation: 'none' as const,
      lazy: false,
      lazyPreloadDistance: 0,
      detachInactiveScreens: false,
      freezeOnBlur: false,
      sceneContainerStyle: {
        backgroundColor: '#0F172A',
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
  tabBarBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  tabBarFill: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 999,
  },
  tabBarTopBorder: {
    position: 'absolute',
    top: 0.75,
    left: 14,
    right: 14,
    height: 1,
    borderRadius: 999,
  },
  tabBarHighlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: 14,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
});
