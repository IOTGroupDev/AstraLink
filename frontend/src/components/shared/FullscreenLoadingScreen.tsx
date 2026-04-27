import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LottieView from 'lottie-react-native';

const loadingBackground = require('../../../assets/loading-bg.png');
const loadingAnimation = require('../../../assets/loading-lottie.json');

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
          <Text style={styles.text}>
            Please wait while{'\n'}we align your stars
          </Text>
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
    gap: 4,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  animation: {
    width: 168,
    height: 138,
  },
});
