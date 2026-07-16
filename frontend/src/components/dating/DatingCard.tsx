import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import type { CandidateBadge } from '../../types/dating';

interface DatingCardProps {
  user: {
    id: string;
    name: string;
    age?: number | null;
    zodiacSign?: string | null;
    compatibility?: number | null;
    compatibilitySummary?: string | null;
    badge?: CandidateBadge;
    bio?: string | null;
    interests?: string[];
    city?: string | null;
    photos?: string[] | null;
    photoUrl?: string | null;
    lookingFor?: string | null;
    lastActive?: string | null;
  };
  cardHeight?: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onChat: () => void;
  onOpenProfile: () => void;
  onOpenActions: () => void;
  actionsDisabled?: boolean;
  isTop: boolean;
}

const badgeLabel: Record<CandidateBadge, string> = {
  high: 'High match',
  medium: 'Good match',
  low: 'New match',
};

function DatingCard({
  user,
  cardHeight = 560,
  onSwipe,
  onOpenProfile,
  onOpenActions,
  actionsDisabled = false,
}: DatingCardProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = useMemo(
    () =>
      (Array.isArray(user.photos) ? user.photos : [])
        .filter((photo): photo is string => Boolean(photo))
        .concat(
          user.photoUrl && !user.photos?.includes(user.photoUrl)
            ? [user.photoUrl]
            : []
        ),
    [user.photoUrl, user.photos]
  );

  useEffect(() => setPhotoIndex(0), [user.id]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.25;
      rotation.value = interpolate(
        event.translationX,
        [-width, width],
        [-12, 12]
      );
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationX) > width * 0.26;
      if (!shouldSwipe) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
        return;
      }
      const direction = event.translationX > 0 ? 'right' : 'left';
      translateX.value = withTiming(
        direction === 'right' ? width * 1.25 : -width * 1.25,
        { duration: 260, easing: Easing.out(Easing.quad) },
        () => runOnJS(onSwipe)(direction)
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const zodiac = user.zodiacSign
    ? t(`common.zodiacSigns.${user.zodiacSign.toLowerCase()}`, {
        defaultValue: user.zodiacSign,
      })
    : null;
  const matchText =
    user.compatibility != null
      ? `Match ${user.compatibility}%`
      : badgeLabel[user.badge ?? 'low'];
  const title = user.age != null ? `${user.name}, ${user.age}` : user.name;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.card, { height: cardHeight }, animatedStyle]}
      >
        <Pressable style={styles.cardPressable} onPress={onOpenProfile}>
          {photos[photoIndex] ? (
            <Image source={{ uri: photos[photoIndex] }} style={styles.photo} />
          ) : (
            <LinearGradient
              colors={['#B58BCB', '#76518E']}
              style={styles.photoFallback}
            >
              <Ionicons
                name="person"
                size={118}
                color="rgba(255,255,255,0.28)"
              />
            </LinearGradient>
          )}

          <LinearGradient
            colors={['rgba(8,14,28,0)', 'rgba(8,14,28,0.12)', '#080E1C']}
            locations={[0.45, 0.68, 0.84]}
            style={StyleSheet.absoluteFillObject}
          />

          {photos.length > 1 ? (
            <View style={styles.photoSteps}>
              {photos.map((photo, index) => (
                <Pressable
                  key={`${photo}-${index}`}
                  onPress={() => setPhotoIndex(index)}
                  style={[
                    styles.photoStep,
                    index === photoIndex && styles.photoStepActive,
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.matchBadge}>
            <View style={styles.matchRing} />
            <Text style={styles.matchBadgeText}>{matchText}</Text>
          </View>

          <Pressable
            hitSlop={12}
            disabled={actionsDisabled}
            onPress={onOpenActions}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={21} color="#FFFFFF" />
          </Pressable>

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.name}>{title}</Text>
                {zodiac ? <Text style={styles.zodiac}>{zodiac}</Text> : null}
              </View>
              {user.city ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={22} color="#EFEAF4" />
                  <Text style={styles.locationText}>{user.city}</Text>
                </View>
              ) : null}
            </View>

            {user.bio ? (
              <Text numberOfLines={2} style={styles.bio}>
                {user.bio}
              </Text>
            ) : null}

            <View style={styles.detailsRow}>
              <View style={styles.detailsColumn}>
                {user.lookingFor ? (
                  <View style={styles.detail}>
                    <Ionicons name="heart-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.detailText}>{user.lookingFor}</Text>
                  </View>
                ) : null}
                <View style={styles.detail}>
                  <Ionicons name="planet-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.detailText}>{matchText}</Text>
                </View>
              </View>
              <View style={styles.tags}>
                {(user.interests ?? []).slice(0, 4).map((interest) => (
                  <View key={interest} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#080E1C',
    borderWidth: 1,
    borderColor: 'rgba(136,130,178,0.45)',
  },
  cardPressable: { flex: 1 },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '77%' },
  photoFallback: {
    width: '100%',
    height: '77%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSteps: {
    position: 'absolute',
    left: 74,
    right: 74,
    top: 10,
    flexDirection: 'row',
    gap: 5,
  },
  photoStep: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoStepActive: { backgroundColor: '#FFFFFF' },
  matchBadge: {
    position: 'absolute',
    top: 20,
    left: 16,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(102,79,127,0.78)',
  },
  matchRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#21D6B1',
  },
  matchBadgeText: { color: '#EAE5EE', fontSize: 13 },
  moreButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,32,58,0.58)',
  },
  info: { position: 'absolute', left: 16, right: 16, bottom: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flexShrink: 1 },
  name: { color: '#FFFFFF', fontSize: 21, lineHeight: 26, fontWeight: '500' },
  zodiac: { color: '#E6DEE9', fontSize: 16, lineHeight: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#DDD5E3', fontSize: 14 },
  bio: { color: '#EDE8EF', fontSize: 14, lineHeight: 17, marginTop: 10 },
  detailsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  detailsColumn: { flex: 1, gap: 5 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { color: '#FFFFFF', fontSize: 12, flexShrink: 1 },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    borderRadius: 12,
    backgroundColor: '#6F1F87',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: '#EEDDF2', fontSize: 10 },
});

export default React.memo(DatingCard);
