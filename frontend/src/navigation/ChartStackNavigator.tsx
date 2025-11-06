import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyChartScreen from '../screens/swap/MyChartScreen';
import NatalChartScreen from '../screens/NatalChartScreen';

const Stack = createStackNavigator();

export default function ChartStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="MyChart" component={MyChartScreen} />
      <Stack.Screen name="NatalChart" component={NatalChartScreen} />
    </Stack.Navigator>
  );
}
