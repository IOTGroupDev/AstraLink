import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { theme } from '../../styles/theme';

/**
 * Скелетон для большого виджета (LunarCalendar, MainTransit, etc.)
 */
export const LargeWidgetSkeleton: React.FC = () => {
  return (
    <BlurView intensity={10} tint="dark" style={styles.cardLarge}>
      <LinearGradient
        colors={theme.gradients.lunar}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.largeContent}>
          <SkeletonLoader
            variant="text"
            width={180}
            height={24}
            style={styles.mb12}
          />
          <SkeletonLoader variant="circle" height={80} style={styles.mb16} />
          <SkeletonLoader
            variant="text"
            width={140}
            height={20}
            style={styles.mb8}
          />
          <SkeletonLoader variant="text" width={120} height={16} />
        </View>
      </LinearGradient>
    </BlurView>
  );
};

/**
 * Скелетон для маленьких карточек (2 в ряд)
 */
export const SmallCardsSkeleton: React.FC = () => {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={theme.gradients.lunar}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={[styles.smallCard, { marginRight: 8 }]}
      >
        <View style={styles.smallContent}>
          <View>
            <SkeletonLoader
              variant="text"
              width={60}
              height={14}
              style={styles.mb8}
            />
            <SkeletonLoader variant="text" width={40} height={20} />
          </View>
          <SkeletonLoader variant="circle" height={48} />
        </View>
      </LinearGradient>

      <LinearGradient
        colors={theme.gradients.lunar}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={[styles.smallCard, { marginLeft: 8 }]}
      >
        <View style={styles.smallContent}>
          <View>
            <SkeletonLoader
              variant="text"
              width={60}
              height={14}
              style={styles.mb8}
            />
            <SkeletonLoader variant="text" width={40} height={20} />
          </View>
          <SkeletonLoader variant="circle" height={48} />
        </View>
      </LinearGradient>
    </View>
  );
};

/**
 * Скелетон для виджета гороскопа (HoroscopeWidget)
 */
export const HoroscopeWidgetSkeleton: React.FC = () => {
  return (
    <BlurView intensity={10} tint="dark" style={styles.cardLarge}>
      <LinearGradient
        colors={theme.gradients.lunar}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.largeContent}>
          <SkeletonLoader
            variant="text"
            width={200}
            height={24}
            style={styles.mb16}
          />
          <SkeletonLoader
            variant="text"
            width="100%"
            height={16}
            style={styles.mb8}
          />
          <SkeletonLoader
            variant="text"
            width="95%"
            height={16}
            style={styles.mb8}
          />
          <SkeletonLoader
            variant="text"
            width="90%"
            height={16}
            style={styles.mb16}
          />

          {/* Кнопки */}
          <View style={styles.buttonRow}>
            <SkeletonLoader
              variant="rect"
              width={100}
              height={36}
              style={{ marginRight: 8 }}
            />
            <SkeletonLoader
              variant="rect"
              width={100}
              height={36}
              style={{ marginRight: 8 }}
            />
            <SkeletonLoader variant="rect" width={100} height={36} />
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );
};

/**
 * Скелетон для виджета энергии (EnergyWidget)
 */
export const EnergyWidgetSkeleton: React.FC = () => {
  return (
    <BlurView intensity={10} tint="dark" style={styles.cardLarge}>
      <LinearGradient
        colors={theme.gradients.lunar}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.largeContent}>
          <SkeletonLoader
            variant="text"
            width={160}
            height={24}
            style={styles.mb16}
          />

          {/* Шкалы энергии */}
          <View style={styles.mb12}>
            <SkeletonLoader
              variant="text"
              width={80}
              height={14}
              style={styles.mb8}
            />
            <SkeletonLoader variant="rect" width="100%" height={8} />
          </View>

          <View style={styles.mb12}>
            <SkeletonLoader
              variant="text"
              width={80}
              height={14}
              style={styles.mb8}
            />
            <SkeletonLoader variant="rect" width="100%" height={8} />
          </View>

          <View style={styles.mb12}>
            <SkeletonLoader
              variant="text"
              width={80}
              height={14}
              style={styles.mb8}
            />
            <SkeletonLoader variant="rect" width="100%" height={8} />
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );
};

/**
 * Скелетон для виджета биоритмов (BiorhythmsWidget)
 */
export const BiorhythmsWidgetSkeleton: React.FC = () => {
  return (
    <BlurView intensity={10} tint="dark" style={styles.cardLarge}>
      <LinearGradient
        colors={theme.gradients.lunar}
        start={{ x: 0, y: 0.44 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.largeContent}>
          <SkeletonLoader
            variant="text"
            width={140}
            height={24}
            style={styles.mb16}
          />

          {/* График */}
          <SkeletonLoader
            variant="rect"
            width="100%"
            height={150}
            style={styles.mb16}
          />

          {/* Легенда */}
          <View style={styles.legendRow}>
            <SkeletonLoader
              variant="circle"
              height={12}
              style={{ marginRight: 8 }}
            />
            <SkeletonLoader
              variant="text"
              width={80}
              height={12}
              style={{ marginRight: 16 }}
            />
            <SkeletonLoader
              variant="circle"
              height={12}
              style={{ marginRight: 8 }}
            />
            <SkeletonLoader variant="text" width={80} height={12} />
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  cardLarge: {
    borderRadius: theme.borderRadius.large,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  gradient: {
    padding: theme.spacing.lg,
    minHeight: 150,
  },
  largeContent: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  smallCard: {
    flex: 1,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    minHeight: 100,
  },
  smallContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mb8: {
    marginBottom: theme.spacing.sm,
  },
  mb12: {
    marginBottom: theme.spacing.md,
  },
  mb16: {
    marginBottom: theme.spacing.lg,
  },
});
