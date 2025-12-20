import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import PlanetIcon from '../svg/planets/PlanetIcon';

interface MainTransitWidgetProps {
  transitData: {
    name: string;
    aspect?: string;
    targetPlanet?: string;
    strength?: number;
    description: string;
  } | null;
  isLoading?: boolean;
}

const MainTransitWidget: React.FC<MainTransitWidgetProps> = ({
  transitData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <BlurView intensity={10} style={styles.blurContainer}>
          <LinearGradient
            colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
            start={{ x: 0, y: 0.44 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradient}
          >
            <LinearGradient
              colors={['rgba(237, 164, 255, 1)', 'rgba(241, 197, 255, 1)']}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.border}
            />
            <View style={styles.content}>
              <Text style={styles.title}>🪐 Главный транзит</Text>
              <Text style={{ color: '#A78BFA', textAlign: 'center' }}>
                Загрузка транзита...
              </Text>
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    );
  }

  if (!transitData) {
    return null;
  }

  // Форматируем силу в проценты
  const strengthPercent = transitData.strength
    ? Math.round(transitData.strength * 100)
    : 99;

  return (
    <View style={styles.container}>
      <BlurView intensity={10} style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(35, 0, 46, 0.4)', 'rgba(89, 1, 114, 0.4)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.gradient}
        >
          <LinearGradient
            colors={['rgba(237, 164, 255, 1)', 'rgba(241, 197, 255, 1)']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.border}
          />

          <View style={styles.content}>
            {/* Заголовок */}
            <Text style={styles.title}>🪐 Главный транзит</Text>

            {/* Контейнер с иконкой и текстом */}
            <View style={styles.mainContent}>
              {/* Иконка планеты */}
              <View style={styles.iconContainer}>
                <View style={styles.iconFrame}>
                  <PlanetIcon
                    name={transitData.targetPlanet || transitData.name}
                    size={62}
                  />
                </View>
              </View>

              {/* Текстовая информация */}
              <View style={styles.textContainer}>
                <Text style={styles.transitName}>
                  {transitData.description}
                </Text>
                <Text style={styles.transitStrength}>
                  Сила: {strengthPercent}%
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginBottom: 20,
  },
  blurContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 12,
    position: 'relative',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    opacity: 0.1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0,
    lineHeight: 19.5,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconFrame: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionMark: {
    fontSize: 34.44,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 42,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  transitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 19.5,
  },
  transitStrength: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0,
    lineHeight: 15.85,
  },
});

export default MainTransitWidget;
