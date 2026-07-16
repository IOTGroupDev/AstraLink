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
import MaskedView from '@react-native-masked-view/masked-view';
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
        <Pressable
          style={styles.cardPressable}
          onPress={onOpenProfile}
          onLongPress={actionsDisabled ? undefined : onOpenActions}
        >
          <MaskedView
            pointerEvents="none"
            style={styles.photoMask}
            maskElement={
              <LinearGradient
                colors={['#FFFFFF', '#FFFFFF', 'rgba(255,255,255,0)']}
                locations={[0, 0.58, 0.86]}
                style={StyleSheet.absoluteFillObject}
              />
            }
          >
            <View style={styles.photoClip}>
              {photos[photoIndex] ? (
                <Image
                  source={{ uri: photos[photoIndex] }}
                  style={styles.photo}
                />
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
                colors={['rgba(8,14,28,0)', 'rgba(8,14,28,0.28)', '#080E1C']}
                locations={[0.42, 0.69, 0.9]}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          </MaskedView>

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
                {user.lastActive ? (
                  <View style={styles.detail}>
                    <Ionicons name="time-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.detailText}>
                      {t('dating.card.recentlyActive', {
                        defaultValue: 'Recently active',
                      })}
                    </Text>
                  </View>
                ) : null}
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
    backgroundColor: 'transparent',
  },
  cardPressable: { flex: 1 },
  photoMask: { ...StyleSheet.absoluteFillObject },
  photoClip: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#080E1C',
  },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  photoFallback: {
    width: '100%',
    height: '100%',
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
    top: 15,
    left: 15,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  matchRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#21D6B1',
  },
  matchBadgeText: { color: '#EAE5EE', fontSize: 13 },
  info: { position: 'absolute', left: 16, right: 16, bottom: 17 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flexShrink: 1 },
  name: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 20,
    lineHeight: 24,
  },
  zodiac: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
  },
  bio: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 10,
  },
  detailsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  detailsColumn: { flex: 1, gap: 5 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    borderRadius: 12,
    backgroundColor: '#6F1F87',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
  },
});

export default React.memo(DatingCard);
