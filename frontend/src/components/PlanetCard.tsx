import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import PlanetIcon from './PlanetIcon';

interface PlanetCardProps {
  title: string;
  interpretation: string;
  strengths?: string[];
  challenges?: string[];
  planetKey?: string; // english key for PlanetIcon (sun, moon, etc)
  house?: number; // optional house badge
  imageUri?: string; // remote image url
  imageSource?: ImageSourcePropType; // local require(...) or other source
}

const PlanetCard: React.FC<PlanetCardProps> = ({
  title,
  imageUri,
  imageSource,
  interpretation,
  strengths = [],
  challenges = [],
  planetKey,
  house,
}) => {
  const src = imageSource ?? (imageUri ? { uri: imageUri } : undefined);

  return (
    <ImageBackground
      source={src as any}
      style={styles.card}
      imageStyle={styles.cardImage}
    >
      <View style={styles.overlay} />

      <View style={styles.header}>
        {planetKey ? <PlanetIcon planet={planetKey} size={18} /> : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {typeof house === 'number' ? (
          <View style={styles.houseBadge}>
            <Text style={styles.badgeText}>{house} дом</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.text}>{interpretation}</Text>

      {Array.isArray(strengths) && strengths.length > 0 ? (
        <View style={styles.chipRow}>
          {strengths.slice(0, 3).map((s, i) => (
            <View key={`str-${i}`} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {Array.isArray(challenges) && challenges.length > 0 ? (
        <View style={styles.chipRow}>
          {challenges.slice(0, 3).map((c, i) => (
            <View key={`ch-${i}`} style={[styles.chip, styles.chipDanger]}>
              <Text style={styles.chipDangerText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 16,
  },
  overlay: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 8,
  },
  title: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1,
  },
  houseBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    zIndex: 2,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    zIndex: 2,
  },
  chip: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  chipDanger: {
    backgroundColor: 'rgba(255, 107, 107, 0.10)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  chipDangerText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PlanetCard;
