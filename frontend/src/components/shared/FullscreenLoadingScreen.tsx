import React from 'react';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LottieView from 'lottie-react-native';

const loadingBackground = require('../../../assets/loading-bg.png');
const loadingAnimation = require('../../../assets/loading-lottie.json');
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const animationSize = Math.min(screenWidth * 0.92, screenHeight * 0.68);

interface FullscreenLoadingScreenProps {
  style?: StyleProp<ViewStyle>;
}

export default function FullscreenLoadingScreen({
  style,
}: FullscreenLoadingScreenProps) {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Please wait while we align your stars"
    >
      <ImageBackground
        source={loadingBackground}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.content}>
          <LottieView
            source={loadingAnimation}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.animation}
          />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E1C',
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  animation: {
    width: animationSize,
    height: animationSize,
  },
});
