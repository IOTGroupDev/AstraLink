import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ZodiacAvatarProps {
  zodiacSign: string;
  size?: number;
  showText?: boolean;
}

const ZODIAC_SYMBOLS = {
  'Aries': '♈',
  'Taurus': '♉',
  'Gemini': '♊',
  'Cancer': '♋',
  'Leo': '♌',
  'Virgo': '♍',
  'Libra': '♎',
  'Scorpio': '♏',
  'Sagittarius': '♐',
  'Capricorn': '♑',
  'Aquarius': '♒',
  'Pisces': '♓'
};

const ZODIAC_ICONS = {
  'Aries': 'flame',
  'Taurus': 'earth',
  'Gemini': 'git-branch',
  'Cancer': 'moon',
  'Leo': 'sunny',
  'Virgo': 'leaf',
  'Libra': 'balance',
  'Scorpio': 'water',
  'Sagittarius': 'arrow-up',
  'Capricorn': 'mountain',
  'Aquarius': 'water-outline',
  'Pisces': 'fish'
};

const ZodiacAvatar: React.FC<ZodiacAvatarProps> = ({ 
  zodiacSign, 
  size = 60,
  showText = false 
}) => {
  const symbol = ZODIAC_SYMBOLS[zodiacSign] || '✨';
  const iconName = ZODIAC_ICONS[zodiacSign] || 'star';
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Zodiac Symbol */}
      <Text style={[styles.symbol, { fontSize: size * 0.4 }]}>
        {symbol}
      </Text>
      
      {/* Alternative: Ionicon */}
      {/* <Ionicons 
        name={iconName} 
        size={size * 0.5} 
        color="#fff" 
        style={styles.icon}
      /> */}
      
      {showText && (
        <Text style={[styles.text, { fontSize: size * 0.15 }]}>
          {zodiacSign}
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
    textShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
  },
  icon: {
    textShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ZodiacAvatar;