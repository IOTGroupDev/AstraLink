import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PlanetIconProps {
  planet: string;
  size?: number;
  color?: string;
  glow?: boolean;
}

const PlanetIcon: React.FC<PlanetIconProps> = ({ 
  planet, 
  size = 24, 
  color = '#fff', 
  glow = false 
}) => {
  const getPlanetIcon = (planetName: string) => {
    if (!planetName || typeof planetName !== 'string') {
      return 'planet';
    }
    
    const iconMap: { [key: string]: string } = {
      sun: 'sunny',
      moon: 'moon',
      mercury: 'planet',
      venus: 'heart',
      mars: 'flame',
      jupiter: 'planet',
      saturn: 'planet',
      uranus: 'planet',
      neptune: 'water',
      pluto: 'planet',
    };
    return iconMap[planetName.toLowerCase()] || 'planet';
  };

  const getPlanetColor = (planetName: string) => {
    if (!planetName || typeof planetName !== 'string') {
      return color;
    }
    
    const colorMap: { [key: string]: string } = {
      sun: '#FFD700',
      moon: '#C0C0C0',
      mercury: '#8C7853',
      venus: '#FFC0CB',
      mars: '#FF4500',
      jupiter: '#D2691E',
      saturn: '#F4A460',
      uranus: '#40E0D0',
      neptune: '#4169E1',
      pluto: '#800080',
    };
    return colorMap[planetName.toLowerCase()] || color;
  };

  const planetColor = getPlanetColor(planet);
  const iconName = getPlanetIcon(planet);

  return (
    <View style={[styles.container, glow && styles.glow]}>
      <Ionicons 
        name={iconName as any} 
        size={size} 
        color={planetColor} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});

export default PlanetIcon;
