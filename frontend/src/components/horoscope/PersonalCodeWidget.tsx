import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { PersonalCodeResult } from '../../types/personal-code';
import { chartAPI } from '../../services/api';
import { logger } from '../../services/logger';

interface PersonalCodeWidgetProps {
  onPress?: () => void;
}

const PersonalCodeWidget: React.FC<PersonalCodeWidgetProps> = ({ onPress }) => {
  const [todayCode, setTodayCode] = useState<PersonalCodeResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-generate daily luck code
  useEffect(() => {
    loadDailyCode();
  }, []);

  const loadDailyCode = async () => {
    try {
      setLoading(true);
      const code = await chartAPI.generatePersonalCode('luck', 4);
      setTodayCode(code);
    } catch (error) {
      logger.error('Failed to load daily code', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={30} style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🍀</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Код дня</Text>
              <Text style={styles.subtitle}>Удача и везение</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A78BFA" />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          ) : todayCode ? (
            <View style={styles.codeContainer}>
              <Text style={styles.code}>{todayCode.code}</Text>
              <View style={styles.energyRow}>
                <Text style={styles.energyLabel}>Энергия:</Text>
                <View style={styles.energyBar}>
                  <View
                    style={[
                      styles.energyBarFill,
                      {
                        width: `${todayCode.interpretation.energyLevel}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.energyValue}>
                  {todayCode.interpretation.energyLevel}%
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.generateButton}
              onPress={loadDailyCode}
            >
              <Ionicons name="sparkles" size={16} color="#10B981" />
              <Text style={styles.generateText}>Создать код</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#10B981',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  codeContainer: {
    alignItems: 'center',
  },
  code: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 12,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  energyLabel: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  energyBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  energyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  generateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});

export default PersonalCodeWidget;
