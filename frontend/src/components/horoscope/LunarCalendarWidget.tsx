import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { MoonPhaseVisual } from './MoonPhaseVisual';
import { chartAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { LunaSvg } from '../svg/moon-phase/Luna';
import { StarSvg } from '../svg/moon-phase/Star';
import { HouseSvg } from '../svg/moon-phase/House';
import { CaseSvg } from '../svg/moon-phase/Case';

export const LunarCalendarWidget: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: moonPhase,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['moonPhase'],
    queryFn: () => chartAPI.getMoonPhase(),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    enabled: isAuthenticated,
  });

  const { data: lunarDay } = useQuery({
    queryKey: ['lunarDay'],
    queryFn: () => chartAPI.getLunarDay(),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) {
    return (
      <BlurView intensity={10} tint="dark" style={styles.cardLarge}>
        <LinearGradient
          colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
          start={{ x: 0, y: 0.44 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <ActivityIndicator size="small" color="rgba(191, 158, 207, 1)" />
        </LinearGradient>
      </BlurView>
    );
  }

  if (!isAuthenticated || isError || !moonPhase) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Большая карточка с фазой луны */}
      <BlurView intensity={10} tint="dark" style={styles.cardLarge}>
        <LinearGradient
          colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
          start={{ x: 0, y: 0.44 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.title}>🌙 Лунный календарь</Text>

          <View style={styles.moonRow}>
            <View style={styles.moonWrapper}>
              <MoonPhaseVisual phase={moonPhase.phase} size={80} />
            </View>

            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{moonPhase.phaseName}</Text>
              <Text style={styles.illumination}>
                {moonPhase.illumination}% освещена
              </Text>
            </View>
          </View>
        </LinearGradient>
      </BlurView>

      {/* Карточки со знаком и домом */}
      {(moonPhase.sign || moonPhase.house) && (
        <View style={styles.row}>
          <LinearGradient
            colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
            start={{ x: 0, y: 0.44 }}
            end={{ x: 0, y: 1 }}
            style={[styles.smallCard, { marginRight: 8 }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.infoLeft}>
                <Text style={styles.label}>Знак</Text>
                <Text style={styles.value}>{moonPhase.sign || '-'}</Text>
              </View>
              <View style={styles.iconRight}>
                <StarSvg width={48} height={48} />
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
            start={{ x: 0, y: 0.44 }}
            end={{ x: 0, y: 1 }}
            style={[styles.smallCard, { marginLeft: 8 }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.infoLeft}>
                <Text style={styles.label}>Дом</Text>
                <Text style={styles.value}>{moonPhase.house || '-'}</Text>
              </View>
              <View style={styles.iconRight}>
                <HouseSvg width={48} height={48} />
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Карточки с лунным днем и советом дня */}
      {lunarDay && (
        <View style={styles.row}>
          <LinearGradient
            colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
            start={{ x: 0, y: 0.44 }}
            end={{ x: 0, y: 1 }}
            style={[styles.smallCard, { marginRight: 8 }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.infoLeft}>
                <Text style={styles.label}>Лунный{'\n'}день</Text>
                <Text style={styles.value}>{lunarDay.number}</Text>
              </View>
              <View style={styles.iconRight}>
                <LunaSvg width={48} height={48} />
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(35, 0, 45, 1)', 'rgba(88, 1, 114, 1)']}
            start={{ x: 0, y: 0.44 }}
            end={{ x: 0, y: 1 }}
            style={[styles.smallCard, { marginLeft: 8 }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.infoLeft}>
                <Text style={styles.label}>День {lunarDay.number}</Text>
                <Text
                  style={styles.adviceText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {(lunarDay.recommendations?.[0] || 'Следуйте интуиции')
                    .replace(/\\n/g, '\n')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/\r\n/g, '\n')}
                </Text>
              </View>
              <View style={styles.iconRight}>
                <CaseSvg width={48} height={48} />
              </View>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  cardLarge: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradient: {
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  moonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  moonWrapper: {
    width: 80,
    height: 80,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  illumination: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  smallCard: {
    flex: 1,
    height: 96,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iconRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  adviceText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
