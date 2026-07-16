import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LoadingIndicator from '../shared/LoadingIndicator';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MoonPhaseVisual } from './MoonPhaseVisual';
import { chartAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { GradientBorderView } from '../shared';

type LunarCalendarWidgetProps = {
  sign?: string;
};

export const LunarCalendarWidget: React.FC<LunarCalendarWidgetProps> = () => {
  const { t, i18n } = useTranslation();
  const getApiLocale = React.useCallback((): 'ru' | 'en' | 'es' => {
    const lang = String(i18n.language || 'en').toLowerCase();
    return lang === 'ru' || lang === 'en' || lang === 'es' ? lang : 'en';
  }, [i18n.language]);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data: moonPhase,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['moonPhase', i18n.language],
    queryFn: () => chartAPI.getMoonPhase(undefined, getApiLocale()),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    enabled: isAuthenticated,
  });

  const { data: lunarDay } = useQuery({
    queryKey: ['lunarDay', i18n.language],
    queryFn: () => chartAPI.getLunarDay(undefined, getApiLocale()),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          🌙 {t('horoscope.lunarCalendar.title')}
        </Text>
        <GradientBorderView
          colors={['rgba(135, 98, 154, 0.3)', 'rgba(135, 98, 154, 0.08)']}
          gradientProps={{
            locations: [0, 1],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
          }}
          style={styles.phaseCardBorder}
          contentStyle={styles.phaseCardContent}
        >
          <LoadingIndicator size="small" />
        </GradientBorderView>
      </View>
    );
  }

  if (!isAuthenticated || isError || !moonPhase) {
    return null;
  }

  const lunarAdvice = (
    lunarDay?.summary ||
    lunarDay?.bestFor?.[0] ||
    lunarDay?.recommendations?.[0] ||
    t('horoscope.lunarCalendar.adviceFallback')
  )
    .replace(/\\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n/g, '\n');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌙 {t('horoscope.lunarCalendar.title')}</Text>

      {lunarDay ? (
        <GradientBorderView
          colors={[
            'rgba(255, 255, 255, 0.3)',
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0)',
          ]}
          gradientProps={{
            locations: [0, 0.67, 1],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
          }}
          style={styles.lunarDayBorder}
          contentStyle={styles.lunarDayContent}
        >
          <Text style={styles.lunarDayLine}>
            <Text style={styles.lunarDayLabel}>
              {t('horoscope.lunarCalendar.labels.lunarDay')}{' '}
            </Text>
            <Text style={styles.lunarDayNumber}>{lunarDay.number}</Text>
          </Text>
          <Text style={styles.lunarAdvice} numberOfLines={2}>
            {lunarAdvice}
          </Text>
        </GradientBorderView>
      ) : null}

      <GradientBorderView
        colors={['rgba(135, 98, 154, 0.3)', 'rgba(135, 98, 154, 0.08)']}
        gradientProps={{
          locations: [0, 1],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
        }}
        style={styles.phaseCardBorder}
        contentStyle={styles.phaseCardContent}
      >
        <LinearGradient
          colors={['rgba(173, 58, 231, 0.2)', 'rgba(97, 32, 129, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.phaseGradient}
        >
          <View style={styles.moonRow}>
            <View style={styles.moonWrapper}>
              <MoonPhaseVisual phase={moonPhase.phase} size={80} />
            </View>

            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName} numberOfLines={1}>
                {moonPhase.phaseName}
              </Text>
              <Text style={styles.illumination}>
                {t('horoscope.lunarCalendar.illuminated', {
                  percent: moonPhase.illumination,
                })}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </GradientBorderView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: '100%',
  },
  title: {
    width: '100%',
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: -1.1,
  },
  lunarDayBorder: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
  },
  lunarDayContent: {
    gap: 10,
    borderRadius: 5,
    padding: 8,
    backgroundColor: 'transparent',
  },
  lunarDayLine: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
  },
  lunarDayLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  lunarDayNumber: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lunarAdvice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 18,
  },
  phaseCardBorder: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
  },
  phaseCardContent: {
    borderRadius: 11,
    overflow: 'hidden',
  },
  phaseGradient: {
    padding: 20,
  },
  moonRow: {
    minHeight: 80,
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
    minWidth: 0,
    justifyContent: 'center',
    gap: 10,
  },
  phaseName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -1,
  },
  illumination: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -1,
  },
});
