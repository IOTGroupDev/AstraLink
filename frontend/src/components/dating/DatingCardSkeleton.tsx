import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { theme } from '../../styles/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const DEFAULT_CARD_HEIGHT = height * 0.65;
const MIN_CARD_HEIGHT = 400;
const MAX_CARD_HEIGHT = 640;

type DatingCardSkeletonProps = {
  cardHeight?: number;
};

export const DatingCardSkeleton: React.FC<DatingCardSkeletonProps> = ({
  cardHeight,
}) => {
  const resolvedCardHeight =
    cardHeight != null
      ? Math.min(MAX_CARD_HEIGHT, Math.max(0, cardHeight))
      : Math.max(
          MIN_CARD_HEIGHT,
          Math.min(MAX_CARD_HEIGHT, DEFAULT_CARD_HEIGHT)
        );

  return (
    <View style={[styles.container, { height: resolvedCardHeight }]}>
      <BlurView intensity={10} tint="dark" style={styles.card}>
        <LinearGradient
          colors={theme.gradients.lunar}
          start={{ x: 0, y: 0.44 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.photoPlaceholder}>
            <SkeletonLoader
              variant="circle"
              height={100}
              style={styles.centerIcon}
            />
          </View>

          <View style={styles.sideButtons}>
            <SkeletonLoader variant="circle" height={44} style={styles.mb10} />
            <SkeletonLoader variant="circle" height={44} style={styles.mb10} />
            <SkeletonLoader variant="circle" height={44} />
          </View>

          <View style={styles.infoContainer}>
            <BlurView intensity={20} tint="dark" style={styles.infoBlur}>
              <SkeletonLoader
                variant="text"
                width={180}
                height={24}
                style={styles.mb8}
              />

              <View style={styles.metaRow}>
                <SkeletonLoader variant="text" width={96} height={16} />
                <SkeletonLoader variant="text" width={14} height={16} />
                <SkeletonLoader variant="text" width={120} height={14} />
              </View>

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

              <View style={styles.detailsRow}>
                <SkeletonLoader variant="text" width={80} height={14} />
                <SkeletonLoader variant="text" width={70} height={14} />
                <SkeletonLoader variant="text" width={90} height={14} />
              </View>

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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    marginBottom: 6,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
});
