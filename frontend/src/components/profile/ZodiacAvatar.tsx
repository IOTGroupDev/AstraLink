import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ZodiacAvatarProps {
  zodiacSign: string;
  size?: number;
  showText?: boolean;
}

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

const normalizeZodiacKey = (sign: string): string => {
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

  const raw = (sign || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  return map[lower] ?? lower;
};

const ZodiacAvatar: React.FC<ZodiacAvatarProps> = ({
  zodiacSign,
  size = 60,
  showText = false,
}) => {
  const { t } = useTranslation();

  const symbol = ZODIAC_SYMBOLS[zodiacSign] || '✨';

  const zodiacKey = normalizeZodiacKey(zodiacSign);
  const displayName = zodiacKey
    ? t(`common.zodiacSigns.${zodiacKey}`, { defaultValue: zodiacSign })
    : zodiacSign;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Zodiac Symbol */}
      <Text style={[styles.symbol, { fontSize: size * 0.4 }]}>{symbol}</Text>

      {/* Alternative: Ionicon */}
      {/* <Ionicons
        name={iconName}
        size={size * 0.5}
        color="#fff"
        style={styles.icon}
      /> */}

      {showText && (
        <Text style={[styles.text, { fontSize: size * 0.15 }]}>
          {displayName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  symbol: {
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  icon: {
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ZodiacAvatar;
