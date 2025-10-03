import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ChartStackNavigator from './ChartStackNavigator';
import DatingScreen from '../screens/DatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CosmicSimulatorScreen from '../screens/CosmicSimulatorScreen';
import { ROUTES } from './routes';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === ROUTES.TABS.CHART_STACK) {
            iconName = focused ? 'planet' : 'planet-outline';
          } else if (route.name === ROUTES.TABS.COSMIC_SIMULATOR) {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === ROUTES.TABS.DATING) {
            iconName = focused ? 'heart-circle' : 'heart-circle-outline';
          } else if (route.name === ROUTES.TABS.PROFILE) {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarStyle: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(139, 92, 246, 0.3)',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
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
        name={ROUTES.TABS.CHART_STACK}
        component={ChartStackNavigator}
        options={{ title: 'Карты', headerShown: false }}
      />
      <Tab.Screen
        name={ROUTES.TABS.COSMIC_SIMULATOR}
        component={CosmicSimulatorScreen}
        options={{ title: 'Симулятор', headerShown: false }}
      />
      <Tab.Screen
        name={ROUTES.TABS.DATING}
        component={DatingScreen}
        options={{ title: 'Dating', headerShown: false }}
      />
      <Tab.Screen
        name={ROUTES.TABS.PROFILE}
        component={ProfileScreen}
        options={{ title: 'Профиль', headerShown: false }}
      />
    </Tab.Navigator>
  );
}
