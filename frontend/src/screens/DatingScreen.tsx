import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HeartOutlineIcon from '../../assets/icons/heart-outline.svg';

const comingSoonBackground = require('../../assets/coming-soon-gb.png');

export default function DatingScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={comingSoonBackground}
        resizeMode="cover"
        style={styles.background}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top,
              paddingBottom: Math.max(96, tabBarHeight + 32),
            },
          ]}
        >
          <HeartOutlineIcon width={50} height={50} color="#FFFFFF" />
          <Text style={styles.title}>Coming soon</Text>
          <Text style={styles.description}>
            Something special is on the way.{'\n'}Soon you'll discover people
            {'\n'}who truly align with you.
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  background: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 31,
    marginTop: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(8, 14, 28, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 290,
    textAlign: 'center',
    textShadowColor: 'rgba(8, 14, 28, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
});
