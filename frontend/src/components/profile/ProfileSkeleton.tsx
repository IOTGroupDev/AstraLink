import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { theme } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * ProfileSkeleton - скелетон для экрана профиля
 * Соответствует структуре ProfileScreen
 */
export const ProfileSkeleton: React.FC = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: Math.max(40, tabBarHeight + insets.bottom + 16),
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <SkeletonLoader variant="text" width={150} height={32} />
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <SkeletonLoader variant="circle" height={120} style={styles.mb16} />
          <SkeletonLoader
            variant="text"
            width={180}
            height={24}
            style={styles.mb4}
          />
          <SkeletonLoader variant="text" width={120} height={16} />
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <SkeletonLoader
            variant="text"
            width={140}
            height={24}
            style={styles.mb24}
          />
          <BlurView intensity={10} tint="dark" style={styles.subscriptionCard}>
            <LinearGradient
              colors={theme.gradients.lunar}
              start={{ x: 0, y: 0.44 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.subscriptionHeader}>
                <SkeletonLoader variant="rect" width={100} height={28} />
                <SkeletonLoader variant="rect" width={80} height={28} />
              </View>
              <SkeletonLoader
                variant="text"
                width="70%"
                height={12}
                style={styles.mb4}
              />
              <SkeletonLoader variant="rect" width="100%" height={6} />
            </LinearGradient>
          </BlurView>
        </View>

        {/* Natal Chart Section */}
        <View style={styles.section}>
          <SkeletonLoader
            variant="text"
            width={160}
            height={24}
            style={styles.mb24}
          />
          <BlurView intensity={10} tint="dark" style={styles.chartCard}>
            <LinearGradient
              colors={theme.gradients.lunar}
              start={{ x: 0, y: 0.44 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Chart placeholder */}
              <SkeletonLoader
                variant="circle"
                height={180}
                style={styles.mb16}
              />
              <SkeletonLoader
                variant="text"
                width="80%"
                height={16}
                style={styles.mb8}
              />
              <SkeletonLoader
                variant="text"
                width="90%"
                height={14}
                style={styles.mb24}
              />

              {/* Buttons */}
              <SkeletonLoader
                variant="rect"
                width="100%"
                height={48}
                style={styles.mb12}
              />
              <SkeletonLoader variant="rect" width="100%" height={48} />
            </LinearGradient>
          </BlurView>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <SkeletonLoader
            variant="text"
            width={120}
            height={24}
            style={styles.mb24}
          />
          <BlurView intensity={10} tint="dark" style={styles.settingsCard}>
            <LinearGradient
              colors={theme.gradients.lunar}
              start={{ x: 0, y: 0.44 }}
              end={{ x: 0, y: 1 }}
              style={styles.settingsGradient}
            >
              {/* Setting items */}
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.settingItem}>
                  <SkeletonLoader variant="circle" height={32} />
                  <SkeletonLoader
                    variant="text"
                    width={140}
                    height={16}
                    style={styles.flex1}
                  />
                  <SkeletonLoader variant="circle" height={24} />
                </View>
              ))}
            </LinearGradient>
          </BlurView>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
  mb24: {
    marginBottom: 24,
  },
  subscriptionCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsGradient: {
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
});
