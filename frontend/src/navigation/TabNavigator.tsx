import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ChartStackNavigator from './ChartStackNavigator';
import DatingScreen from '../screens/DatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CosmicSimulatorScreen from '../screens/CosmicSimulatorScreen';
import AdvisorChatScreen from '../screens/AdvisorChatScreen';
import HoroscopeScreen from '../screens/HoroscopeScreen';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import HoroscopeSvg from '../components/svg/tabs/HoroscopeSvg';
import SimulationSvg from '../components/svg/tabs/SimulationSvg';
import DatingSvg from '../components/svg/tabs/DatingSvg';
import AdviserSvg from '../components/svg/tabs/AdviserSvg';
import ProfileSvg from '../components/svg/tabs/ProfileSvg';
import ChatListScreen from '../screens/ChatListScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Horoscope') {
            return <HoroscopeSvg size={size} color={color} />;
            // iconName = focused ? 'planet' : 'planet-outline';
          } else if (route.name === 'CosmicSimulator') {
            return <SimulationSvg size={size} color={color} />;
            // iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Dating') {
            return <DatingSvg size={size} color={color} />;
            // iconName = focused ? 'heart-circle' : 'heart-circle-outline';
          } else if (route.name === 'Advisor') {
            return <AdviserSvg size={size} color={color} />;
            // iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Messages') {
            return (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={size}
                color={color}
              />
            );
          } else if (route.name === 'Profile') {
            return <ProfileSvg size={size} color={color} />;
            // iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else {
            // iconName = 'help-outline';
          }

          // return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 1,
          borderTopColor: 'rgba(139, 92, 246, 0.3)',
          paddingBottom: 50,
          paddingTop: 5,
          height: 108,
          backgroundColor: 'transparent', // важно для прозрачности
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
      {/*<Tab.Screen*/}
      {/*  name="ChartStack"*/}
      {/*  component={ChartStackNavigator}*/}
      {/*  options={{ title: 'Карты', headerShown: false }}*/}
      {/*/>*/}
      <Tab.Screen
        name="CosmicSimulator"
        component={CosmicSimulatorScreen}
        options={{ title: 'Симулятор', headerShown: false }}
      />
      <Tab.Screen
        name="Dating"
        component={DatingScreen}
        options={{ title: 'Dating', headerShown: false }}
      />
      <Tab.Screen
        name="Advisor"
        component={AdvisorChatScreen}
        options={{ title: 'Советник', headerShown: false }}
      />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{ title: 'Сообщения', headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профиль', headerShown: false }}
      />
    </Tab.Navigator>
  );
}
