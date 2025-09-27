import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface Planet {
  name: string;
  distance: number;
  size: number;
  color: string;
  speed: number;
  currentPosition: number;
  icon: keyof typeof Ionicons.glyphMap;
}

interface SolarSystemProps {
  currentPlanets: any;
  isLoading?: boolean;
}

// Функция для получения отображаемого названия планеты
const getPlanetDisplayName = (planetName: string): string => {
  const planetNames: { [key: string]: string } = {
    mercury: 'Меркурий',
    venus: 'Венера',
    earth: 'Земля',
    mars: 'Марс',
    jupiter: 'Юпитер',
    saturn: 'Сатурн',
    uranus: 'Уран',
    neptune: 'Нептун',
    pluto: 'Плутон',
    sun: 'Солнце',
    moon: 'Луна',
  };
  return planetNames[planetName] || planetName;
};

// Компонент отдельной планеты
const PlanetComponent: React.FC<{
  planet: Planet;
  rotation: Animated.SharedValue<number>;
  scale: Animated.SharedValue<number>;
}> = ({ planet, rotation, scale }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const planetRotation =
      rotation.value * planet.speed + planet.currentPosition;
    const x = Math.cos((planetRotation * Math.PI) / 180) * planet.distance;
    const y = Math.sin((planetRotation * Math.PI) / 180) * planet.distance;

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[styles.planet, animatedStyle]}>
      <View
        style={[
          styles.planetBody,
          {
            width: planet.size,
            height: planet.size,
            backgroundColor: planet.color,
            borderRadius: planet.size / 2,
          },
        ]}
      >
        <Ionicons name={planet.icon} size={planet.size * 0.6} color="#FFFFFF" />
      </View>
      <Text style={styles.planetName}>{getPlanetDisplayName(planet.name)}</Text>
    </Animated.View>
  );
};

// Компонент орбиты
const OrbitComponent: React.FC<{
  distance: number;
  scale: Animated.SharedValue<number>;
}> = ({ distance, scale }) => {
  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.orbit,
        {
          width: distance * 2,
          height: distance * 2,
          borderRadius: distance,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        orbitStyle,
      ]}
    />
  );
};

const SolarSystem: React.FC<SolarSystemProps> = ({
  currentPlanets,
  isLoading = false,
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  // Планеты с их орбитальными характеристиками
  const planets: Planet[] = [
    {
      name: 'mercury',
      distance: 60,
      size: 8,
      color: '#8C7853',
      speed: 0.8,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'venus',
      distance: 80,
      size: 12,
      color: '#FFC649',
      speed: 0.6,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'earth',
      distance: 100,
      size: 14,
      color: '#6B93D6',
      speed: 0.5,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'mars',
      distance: 130,
      size: 10,
      color: '#C1440E',
      speed: 0.4,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'jupiter',
      distance: 180,
      size: 24,
      color: '#D8CA9D',
      speed: 0.3,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'saturn',
      distance: 240,
      size: 20,
      color: '#FAD5A5',
      speed: 0.25,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'uranus',
      distance: 300,
      size: 16,
      color: '#4FD0E7',
      speed: 0.2,
      currentPosition: 0,
      icon: 'planet',
    },
    {
      name: 'neptune',
      distance: 360,
      size: 16,
      color: '#4B70DD',
      speed: 0.15,
      currentPosition: 0,
      icon: 'planet',
    },
  ];

  // Обновляем позиции планет на основе реальных данных
  useEffect(() => {
    if (currentPlanets) {
      planets.forEach((planet, index) => {
        // Ищем данные планеты по имени
        if (
          currentPlanets[planet.name] &&
          currentPlanets[planet.name].longitude !== undefined
        ) {
          planet.currentPosition = currentPlanets[planet.name].longitude;
        }
      });
    }
  }, [currentPlanets]);

  // Анимация вращения
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 20000, // 20 секунд на полный оборот
        easing: Easing.linear,
      }),
      -1,
      false
    );

    scale.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.Text style={styles.loadingText}>
            Загрузка космических данных...
          </Animated.Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Солнце в центре */}
      <View style={styles.sunContainer}>
        <Animated.View
          style={[styles.sun, { transform: [{ scale: scale.value }] }]}
        >
          <Ionicons name="sunny" size={40} color="#FFD700" />
        </Animated.View>
        <Text style={styles.sunLabel}>Солнце</Text>
      </View>

      {/* Орбиты */}
      {planets.map((planet) => (
        <OrbitComponent
          key={`orbit-${planet.distance}`}
          distance={planet.distance}
          scale={scale}
        />
      ))}

      {/* Планеты */}
      {planets.map((planet, index) => (
        <PlanetComponent
          key={planet.name}
          planet={planet}
          rotation={rotation}
          scale={scale}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  sunContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  sun: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  sunLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  orbit: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  planet: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planetBody: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  planetName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  dateInfo: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default SolarSystem;
