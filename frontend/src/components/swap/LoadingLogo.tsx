import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import CosmicBackground from '../shared/CosmicBackground';
import LogoBlurSvg from '../svg/LogoBlur';

const { width, height } = Dimensions.get('window');
const LOGO_WIDTH = width * 3;
const LOGO_HEIGHT = height * 2;

const LoadingLogo: React.FC = () => {
  return (
    <View style={styles.container}>
      <CosmicBackground />
      <View style={styles.logoContainer}>
        <LogoBlurSvg width={LOGO_WIDTH} height={LOGO_HEIGHT} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingLogo;
