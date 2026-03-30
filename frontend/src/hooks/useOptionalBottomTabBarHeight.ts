import React from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

type UseOptionalBottomTabBarHeightOptions = {
  fallback?: number;
};

export function useOptionalBottomTabBarHeight(
  options: UseOptionalBottomTabBarHeightOptions = {}
) {
  const { fallback = 0 } = options;
  const tabBarHeight = React.useContext(BottomTabBarHeightContext);

  return tabBarHeight ?? fallback;
}
