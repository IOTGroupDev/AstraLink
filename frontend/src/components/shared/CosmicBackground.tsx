import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  delay: number;
  duration: number;
}

interface Meteor {
  id: number;
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  angle: number;
  length: number;
}

// Генерация звезд
const generateStars = (count: number): Star[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT,
    size: Math.random() * 1.5 + 2.5,
    baseOpacity: Math.random() * 0.25 + 0.35, // 0.35-0.6
    delay: Math.random() * 3000,
    duration: Math.random() * 4000 + 3000,
  }));
};

// Генерация метеоров
const generateMeteors = (): Meteor[] => {
  return [
    {
      id: 1,
      startX: Math.random() * SCREEN_WIDTH * 0.3,
      startY: Math.random() * SCREEN_HEIGHT * 0.3,
      delay: 3000,
      duration: 1200,
      angle: 35 + Math.random() * 10,
      length: 60 + Math.random() * 20,
    },
    {
      id: 2,
      startX: SCREEN_WIDTH * 0.5 + Math.random() * SCREEN_WIDTH * 0.3,
      startY: Math.random() * SCREEN_HEIGHT * 0.25,
      delay: 9000,
      duration: 1400,
      angle: 30 + Math.random() * 15,
      length: 50 + Math.random() * 30,
    },
  ];
};

const StarComponent: React.FC<{ star: Star }> = React.memo(({ star }) => {
  const opacity = useSharedValue(star.baseOpacity);

  useEffect(() => {
    opacity.value = withDelay(
      star.delay,
      withRepeat(
        withTiming(star.baseOpacity * 0.4, {
          duration: star.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
});

// Динамический градиент 1
const AnimatedGradient1: React.FC = React.memo(() => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 12000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.8, 0.4, 0.8]);
    return { opacity };
  });

  return (
    <Animated.View style={[styles.gradientLayer, animatedStyle]}>
      <LinearGradient
        colors={[
          'rgba(140, 45, 170, 0.25)',
          'rgba(90, 25, 110, 0.15)',
          'rgba(0, 0, 0, 0)',
        ]}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
    </Animated.View>
  );
});

// Динамический градиент 2
const AnimatedGradient2: React.FC = React.memo(() => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      4000,
      withRepeat(
        withTiming(1, {
          duration: 16000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.4, 0.7, 0.4]);
    return { opacity };
  });

  return (
    <Animated.View style={[styles.gradientLayer, animatedStyle]}>
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0)',
          'rgba(120, 35, 150, 0.2)',
          'rgba(80, 20, 100, 0.15)',
          'rgba(0, 0, 0, 0)',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      />
    </Animated.View>
  );
});

// Динамический градиент 3
const AnimatedGradient3: React.FC = React.memo(() => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      8000,
      withRepeat(
        withTiming(1, {
          duration: 14000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return { opacity };
  });

  return (
    <Animated.View style={[styles.gradientLayer, animatedStyle]}>
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0)',
          'rgba(100, 30, 130, 0.18)',
          'rgba(0, 0, 0, 0)',
        ]}
        locations={[0, 0.65, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />
    </Animated.View>
  );
});

// Компактный метеор
const MeteorComponent: React.FC<{ meteor: Meteor }> = React.memo(
  ({ meteor }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
      const animate = () => {
        progress.value = 0;
        progress.value = withDelay(
          meteor.delay,
          withSequence(
            withTiming(1, {
              duration: meteor.duration,
              easing: Easing.out(Easing.cubic),
            }),
            withDelay(
              Math.random() * 12000 + 10000,
              withTiming(0, { duration: 0 })
            )
          )
        );
      };

      animate();
      const interval = setInterval(animate, 25000);
      return () => clearInterval(interval);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
      const distance = SCREEN_WIDTH * 1.3;
      const translateX = interpolate(
        progress.value,
        [0, 1],
        [
          meteor.startX,
          meteor.startX + distance * Math.cos((meteor.angle * Math.PI) / 180),
        ]
      );
      const translateY = interpolate(
        progress.value,
        [0, 1],
        [
          meteor.startY,
          meteor.startY + distance * Math.sin((meteor.angle * Math.PI) / 180),
        ]
      );

      const opacity = interpolate(
        progress.value,
        [0, 0.08, 0.3, 0.85, 1],
        [0, 1, 1, 0.4, 0]
      );

      return {
        transform: [
          { translateX },
          { translateY },
          { rotate: `${meteor.angle}deg` },
        ],
        opacity,
      };
    });

    return (
      <Animated.View style={[styles.meteorContainer, animatedStyle]}>
        <View style={styles.meteorHead} />
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.95)',
            'rgba(200, 220, 255, 0.7)',
            'rgba(150, 180, 255, 0.4)',
            'rgba(100, 150, 255, 0.15)',
            'rgba(100, 150, 255, 0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.meteorTail, { width: meteor.length }]}
        />
      </Animated.View>
    );
  }
);

const CosmicBackground: React.FC = () => {
  const stars = useMemo(() => generateStars(30), []);
  const meteors = useMemo(() => generateMeteors(), []);

  return (
    <View style={styles.container}>
      {/* Темный фон с фиолетовым оттенком - баланс */}
      <View style={styles.darkBase} />

      {/* Статичный базовый темно-фиолетовый градиент */}
      <LinearGradient
        colors={[
          'rgba(30, 10, 40, 0.7)', // Темно-фиолетовый
          'rgba(18, 8, 25, 0.85)', // Очень темный фиолетовый
          'rgba(10, 5, 15, 0.95)', // Почти черный
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      {/* Динамические градиенты */}
      <AnimatedGradient1 />
      <AnimatedGradient2 />
      <AnimatedGradient3 />

      {/* Метеоры */}
      <View style={styles.meteorsContainer}>
        {meteors.map((meteor) => (
          <MeteorComponent key={meteor.id} meteor={meteor} />
        ))}
      </View>

      {/* Звезды */}
      <View style={styles.starsContainer}>
        {stars.map((star) => (
          <StarComponent key={star.id} star={star} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0618', // Темный фиолетово-черный, но заметный
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  meteorsContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  meteorContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: 3,
  },
  meteorHead: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    marginRight: -1,
  },
  meteorTail: {
    height: 1.5,
  },
});

export default React.memo(CosmicBackground);
