import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * Космический симулятор - экран в разработке
 * TODO: Реализовать функционал симулятора транзитов
 */
export default function CosmicSimulatorScreen() {
  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Ionicons name="planet-outline" size={80} color="#8B5CF6" />
        <Text style={styles.title}>Космический симулятор</Text>
        <Text style={styles.subtitle}>В разработке</Text>
        <Text style={styles.description}>
          Скоро здесь появится интерактивный симулятор{'\n'}
          планетарных транзитов и их влияния{'\n'}
          на вашу натальную карту
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
