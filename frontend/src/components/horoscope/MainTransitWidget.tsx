import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import PlanetIcon from '../svg/planets/PlanetIcon';

interface MainTransitWidgetProps {
  transitData: {
    name: string;
    aspect?: string;
    targetPlanet?: string;
    strength?: number;
    description: string;
    transitPlanetKey?: string;
    natalPlanetKey?: string;
  } | null;
  isLoading?: boolean;
  onPress?: () => void;
}

const MainTransitWidget: React.FC<MainTransitWidgetProps> = ({
  transitData,
  isLoading,
  onPress,
}) => {
  const { t } = useTranslation();
  const planetIconName =
    transitData?.transitPlanetKey ||
    transitData?.natalPlanetKey ||
    transitData?.targetPlanet ||
    transitData?.name ||
    'sun';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer} />
          <Text style={styles.caption}>
            {t('horoscope.mainTransitWidget.title')}
          </Text>
          <Text style={styles.loadingText}>
            {t('horoscope.mainTransitWidget.loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (!transitData) {
    return null;
  }

  const strengthPercent = transitData.strength
    ? Math.round(transitData.strength * 100)
    : 99;

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!onPress}>
      <View style={styles.content}>
        <View style={styles.visualBlock}>
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <View style={styles.iconFrame}>
              <PlanetIcon name={planetIconName} size={68} />
            </View>
          </View>
          <Text style={styles.caption}>
            {t('horoscope.mainTransitWidget.title')}
          </Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.transitStrength}>
            {t('horoscope.mainTransitWidget.strength', {
              percent: strengthPercent,
            })}
          </Text>
          <Text style={styles.transitName} numberOfLines={2}>
            {transitData.name || transitData.description}
          </Text>
          {!!onPress && (
            <View style={styles.detailsCta}>
              <Svg width={180} height={70} style={styles.detailsGlowSvg}>
                <Defs>
                  <RadialGradient id="detailsGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor="#8D26A9" stopOpacity="0.55" />
                    <Stop
                      offset="0.35"
                      stopColor="#8D26A9"
                      stopOpacity="0.26"
                    />
                    <Stop offset="1" stopColor="#8D26A9" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Ellipse
                  cx="90"
                  cy="35"
                  rx="88"
                  ry="28"
                  fill="url(#detailsGlow)"
                />
              </Svg>
              <Text style={styles.transitHint}>
                {t('horoscope.mainTransitWidget.openDetails')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
  },
  visualBlock: {
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(141, 38, 169, 0.16)',
    shadowColor: '#8D26A9',
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  iconFrame: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'center',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  transitStrength: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  transitName: {
    minWidth: '100%',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: 'center',
  },
  detailsCta: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 12,
    position: 'relative',
  },
  detailsGlowSvg: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
  },
  transitHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default MainTransitWidget;
