import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const DEFAULT_CARD_HEIGHT = height * 0.65;
const MIN_CARD_HEIGHT = 400;
const MAX_CARD_HEIGHT = 640;

interface DatingCardProps {
  user: {
    id: string;
    name: string;
    age: number;
    zodiacSign: string;
    compatibility: number;
    bio: string;
    interests: string[];
    distance?: number;
    photoUrl?: string;
    height?: number;
    lookingFor?: string;
  };
  cardHeight?: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onChat: () => void;
  isTop: boolean;
}

const DatingCard: React.FC<DatingCardProps> = ({
  user,
  cardHeight,
  onSwipe,
  onChat,
  isTop: _isTop,
}) => {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const resolvedCardHeight =
    cardHeight != null
      ? Math.min(MAX_CARD_HEIGHT, Math.max(0, cardHeight))
      : Math.max(
          MIN_CARD_HEIGHT,
          Math.min(MAX_CARD_HEIGHT, DEFAULT_CARD_HEIGHT)
        );

  const getZodiacLabel = (sign: string): string => {
    const raw = String(sign || '').trim();
    if (!raw) return sign;

    const map: Record<string, string> = {
      aries: 'aries',
      taurus: 'taurus',
      gemini: 'gemini',
      cancer: 'cancer',
      leo: 'leo',
      virgo: 'virgo',
      libra: 'libra',
      scorpio: 'scorpio',
      sagittarius: 'sagittarius',
      capricorn: 'capricorn',
      aquarius: 'aquarius',
      pisces: 'pisces',
    };

    const key = map[raw.toLowerCase()] ?? raw.toLowerCase();
    return t(`common.zodiacSigns.${key}`, { defaultValue: sign });
  };

  const getInterestLabel = (interest: string): string => {
    const key = String(interest || '')
      .trim()
      .toLowerCase();
    if (!key) return interest;
    return t(`dating.interests.${key}`, { defaultValue: interest });
  };

  const distanceLabel =
    user.distance != null
      ? t('dating.card.distanceAway', {
          distance: user.distance,
          defaultValue: `${user.distance} km away`,
        })
      : null;

  const gestureHandler = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = interpolate(
        event.translationX,
        [-width, width],
        [-15, 15]
      );
    })
    .onEnd((event) => {
      'worklet';
      const shouldSwipe = Math.abs(event.translationX) > width * 0.3;

      if (shouldSwipe) {
        const direction = event.translationX > 0 ? 'right' : 'left';

        translateX.value = withTiming(
          direction === 'right' ? width : -width,
          { duration: 300, easing: Easing.out(Easing.quad) },
          () => {
            runOnJS(onSwipe)(direction);
          }
        );
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const renderInfo = () => (
    <View style={styles.infoContainer}>
      <BlurView intensity={20} tint="dark" style={styles.infoBlur}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>
            {user.name}, {user.age}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.zodiacSign} numberOfLines={1}>
            {getZodiacLabel(user.zodiacSign)}
          </Text>
          {distanceLabel ? (
            <>
              <Text style={styles.metaDivider}>{'\u00B7'}</Text>
              <View style={styles.distanceRow}>
                <Ionicons
                  name="location"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
                <Text style={styles.distanceText} numberOfLines={1}>
                  {distanceLabel}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <Text style={styles.bio} numberOfLines={3}>
          {user.bio}
        </Text>

        <View style={styles.compatibilitySection}>
          <Text style={styles.compatibilityLabel}>
            {t('dating.card.compatibilityLabel')}
          </Text>
          <View style={styles.compatibilityBarContainer}>
            <View style={styles.compatibilityBar}>
              <View
                style={[
                  styles.compatibilityFill,
                  {
                    width: `${user.compatibility}%`,
                    backgroundColor: getCompatibilityColor(user.compatibility),
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.compatibilityPercent,
                { color: getCompatibilityColor(user.compatibility) },
              ]}
            >
              {user.compatibility}%
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons
              name="briefcase-outline"
              size={16}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.detailText}>{t('dating.card.profession')}</Text>
          </View>
          {user.height && (
            <View style={styles.detailItem}>
              <Ionicons
                name="resize-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.detailText}>
                {t('dating.card.heightCm', {
                  height: user.height,
                  defaultValue: `${user.height} cm`,
                })}
              </Text>
            </View>
          )}
          {user.lookingFor && (
            <View style={styles.detailItem}>
              <Ionicons
                name="heart-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.detailText}>{user.lookingFor}</Text>
            </View>
          )}
        </View>

        {user.interests && user.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {user.interests.slice(0, 4).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>
                  {getInterestLabel(interest)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </BlurView>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { height: resolvedCardHeight },
        animatedCardStyle,
      ]}
    >
      <GestureDetector gesture={gestureHandler}>
        <View style={styles.card}>
          {user.photoUrl ? (
            <ImageBackground
              source={{ uri: user.photoUrl }}
              style={styles.photoBackground}
              imageStyle={styles.photoImage}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
              />

              <View style={styles.sideButtons}>
                <TouchableOpacity
                  style={[styles.sideButton, styles.closeButton]}
                  onPress={() => onSwipe('left')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#6F1F87" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sideButton, styles.heartButton]}
                  onPress={() => onSwipe('right')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="heart" size={24} color="#6F1F87" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sideButton, styles.chatButton]}
                  onPress={onChat}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={20}
                    color="#6F1F87"
                  />
                </TouchableOpacity>
              </View>

              {renderInfo()}
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={['#8B5CF6', '#6F1F87', '#4C0E6B']}
              style={styles.photoBackground}
            >
              <View style={styles.placeholderIcon}>
                <Ionicons
                  name="person"
                  size={100}
                  color="rgba(255,255,255,0.3)"
                />
              </View>

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
              />

              <View style={styles.sideButtons}>
                <TouchableOpacity
                  style={[styles.sideButton, styles.closeButton]}
                  onPress={() => onSwipe('left')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#6F1F87" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sideButton, styles.heartButton]}
                  onPress={() => onSwipe('right')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="heart" size={24} color="#6F1F87" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sideButton, styles.chatButton]}
                  onPress={onChat}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={20}
                    color="#6F1F87"
                  />
                </TouchableOpacity>
              </View>

              {renderInfo()}
            </LinearGradient>
          )}
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A0B2E',
  },
  photoBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  photoImage: {
    borderRadius: 20,
  },
  placeholderIcon: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  sideButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 10,
    zIndex: 10,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {},
  heartButton: {},
  chatButton: {},
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minWidth: 0,
  },
  zodiacSign: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    flexShrink: 1,
  },
  metaDivider: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    marginHorizontal: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  distanceText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    flexShrink: 1,
  },
  bio: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
    marginBottom: 10,
  },
  compatibilitySection: {
    marginBottom: 10,
  },
  compatibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  compatibilityBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compatibilityBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  compatibilityFill: {
    height: '100%',
    borderRadius: 4,
  },
  compatibilityPercent: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 45,
    textAlign: 'right',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(111, 31, 135, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(111, 31, 135, 1)',
  },
  interestText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});

export default React.memo(DatingCard);
