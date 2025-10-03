import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyChartScreen from '../screens/MyChartScreen';
import NatalChartScreen from '../screens/NatalChartScreen';
import { ROUTES } from './routes';

const Stack = createStackNavigator();

export default function ChartStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name={ROUTES.CHART_STACK.MY_CHART}
        component={MyChartScreen}
      />
      <Stack.Screen
        name={ROUTES.CHART_STACK.NATAL_CHART}
        component={NatalChartScreen}
      />
    </Stack.Navigator>
  );
}
