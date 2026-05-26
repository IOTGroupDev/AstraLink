import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * ProfileSkeleton - скелетон для экрана профиля
 * Соответствует структуре ProfileScreen
 */
export const ProfileSkeleton: React.FC = () => {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: Math.max(56, tabBarHeight + 28),
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <SkeletonLoader variant="circle" height={100} style={styles.mb12} />
          <SkeletonLoader
            variant="text"
            width={180}
            height={28}
            style={styles.mb4}
          />
          <SkeletonLoader variant="text" width={120} height={16} />
        </View>

        <BlurView intensity={10} tint="dark" style={styles.premiumCard}>
          <View style={styles.premiumContent}>
            <SkeletonLoader variant="circle" height={44} style={styles.mb8} />
            <SkeletonLoader
              variant="text"
              width={100}
              height={20}
              style={styles.mb8}
            />
            <SkeletonLoader
              variant="text"
              width={76}
              height={14}
              style={styles.mb16}
            />
            <View style={styles.chipRow}>
              <SkeletonLoader variant="rect" width={118} height={32} />
              <SkeletonLoader variant="rect" width={112} height={32} />
            </View>
            <View style={styles.chipRow}>
              <SkeletonLoader variant="rect" width={126} height={32} />
              <SkeletonLoader variant="rect" width={104} height={32} />
            </View>
          </View>
        </BlurView>

        <View style={styles.section}>
          <SkeletonLoader
            variant="text"
            width={160}
            height={22}
            style={styles.mb16}
          />
          <SkeletonLoader variant="circle" height={230} style={styles.chart} />
          {[1, 2, 3, 4, 5].map((item) => (
            <SkeletonLoader
              key={item}
              variant="rect"
              width="100%"
              height={56}
              style={styles.mb10}
            />
          ))}
        </View>

        <View style={styles.section}>
          <SkeletonLoader
            variant="text"
            width={120}
            height={22}
            style={styles.mb16}
          />
          {[1, 2, 3].map((item) => (
            <SkeletonLoader
              key={item}
              variant="rect"
              width="100%"
              height={54}
              style={styles.mb10}
            />
          ))}
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
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  section: {
    marginBottom: 26,
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
  mb16: {
    marginBottom: 16,
  },
  premiumCard: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 256,
    marginBottom: 26,
    backgroundColor: '#130545',
    borderWidth: 1,
    borderColor: 'rgba(135, 98, 154, 0.15)',
  },
  premiumContent: {
    minHeight: 256,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  chart: {
    alignSelf: 'center',
    marginBottom: 16,
  },
});
