import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { theme } from '../../styles/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = height * 0.65;

/**
 * DatingCardSkeleton - скелетон для карточки знакомства
 * Соответствует структуре DatingCard
 */
export const DatingCardSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <BlurView intensity={10} tint="dark" style={styles.card}>
        <LinearGradient
          colors={theme.gradients.skeleton}
          start={{ x: 0, y: 0.44 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {/* Область фото/placeholder */}
          <View style={styles.photoPlaceholder}>
            <SkeletonLoader
              variant="circle"
              height={100}
              style={styles.centerIcon}
            />
          </View>

          {/* Кнопки справа */}
          <View style={styles.sideButtons}>
            <SkeletonLoader variant="circle" height={44} style={styles.mb10} />
            <SkeletonLoader variant="circle" height={44} style={styles.mb10} />
            <SkeletonLoader variant="circle" height={44} />
          </View>

          {/* Информация внизу */}
          <View style={styles.infoContainer}>
            <BlurView intensity={20} tint="dark" style={styles.infoBlur}>
              {/* Имя и возраст */}
              <SkeletonLoader
                variant="text"
                width={180}
                height={26}
                style={styles.mb8}
              />

              {/* Знак зодиака */}
              <SkeletonLoader
                variant="text"
                width={120}
                height={16}
                style={styles.mb8}
              />

              {/* Расстояние */}
              <SkeletonLoader
                variant="text"
                width={100}
                height={14}
                style={styles.mb12}
              />

              {/* Био */}
              <SkeletonLoader
                variant="text"
                width="100%"
                height={14}
                style={styles.mb4}
              />
              <SkeletonLoader
                variant="text"
                width="90%"
                height={14}
                style={styles.mb4}
              />
              <SkeletonLoader
                variant="text"
                width="80%"
                height={14}
                style={styles.mb12}
              />

              {/* Совместимость */}
              <SkeletonLoader
                variant="text"
                width={120}
                height={15}
                style={styles.mb8}
              />
              <View style={styles.compatibilityRow}>
                <SkeletonLoader
                  variant="rect"
                  width="100%"
                  height={8}
                  style={styles.flex1}
                />
                <SkeletonLoader variant="text" width={45} height={16} />
              </View>

              {/* Детали */}
              <View style={styles.detailsRow}>
                <SkeletonLoader variant="text" width={80} height={14} />
                <SkeletonLoader variant="text" width={70} height={14} />
                <SkeletonLoader variant="text" width={90} height={14} />
              </View>

              {/* Интересы/теги */}
              <View style={styles.interestsRow}>
                <SkeletonLoader variant="rect" width={80} height={28} />
                <SkeletonLoader variant="rect" width={90} height={28} />
                <SkeletonLoader variant="rect" width={75} height={28} />
                <SkeletonLoader variant="rect" width={85} height={28} />
              </View>
            </BlurView>
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: {
    marginBottom: 20,
  },
  sideButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 10,
    zIndex: 10,
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mb10: {
    marginBottom: 10,
  },
  mb12: {
    marginBottom: 12,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  infoBlur: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
