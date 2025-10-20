import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ChartStackNavigator from './ChartStackNavigator';
import DatingScreen from '../screens/DatingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CosmicSimulatorScreen from '../screens/CosmicSimulatorScreen';
import AdvisorChatScreen from '../screens/AdvisorChatScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'ChartStack') {
            iconName = focused ? 'planet' : 'planet-outline';
          } else if (route.name === 'CosmicSimulator') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Dating') {
            iconName = focused ? 'heart-circle' : 'heart-circle-outline';
          } else if (route.name === 'Advisor') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
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
        name="Registration"
        component={RegisterScreen}
        options={{ title: 'Карты', headerShown: false }}
      />
      <Tab.Screen
        name="ChartStack"
        component={ChartStackNavigator}
        options={{ title: 'Карты', headerShown: false }}
      />
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
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Профиль', headerShown: false }}
      />
    </Tab.Navigator>
  );
}
