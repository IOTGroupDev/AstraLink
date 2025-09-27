import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MyChartScreen from '../screens/MyChartScreen';

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
    </Stack.Navigator>
  );
}
