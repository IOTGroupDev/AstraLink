import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CodePurpose, PersonalCodeResult } from '../types/personal-code';
import { chartAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PersonalCodeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedPurpose, setSelectedPurpose] = useState<CodePurpose>('luck');
  const [selectedDigitCount, setSelectedDigitCount] = useState<number>(4);
  const [result, setResult] = useState<PersonalCodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purposes = [
    {
      key: 'luck' as CodePurpose,
      label: 'Удача',
      icon: '🍀',
      color: '#10B981',
    },
    {
      key: 'health' as CodePurpose,
      label: 'Здоровье',
      icon: '❤️',
      color: '#EF4444',
    },
    {
      key: 'wealth' as CodePurpose,
      label: 'Богатство',
      icon: '💰',
      color: '#F59E0B',
    },
    {
      key: 'love' as CodePurpose,
      label: 'Любовь',
      icon: '💕',
      color: '#EC4899',
    },
    {
      key: 'career' as CodePurpose,
      label: 'Карьера',
      icon: '🎯',
      color: '#8B5CF6',
    },
    {
      key: 'creativity' as CodePurpose,
      label: 'Творчество',
      icon: '🎨',
      color: '#F97316',
    },
    {
      key: 'protection' as CodePurpose,
      label: 'Защита',
      icon: '🛡️',
      color: '#6366F1',
    },
    {
      key: 'intuition' as CodePurpose,
      label: 'Интуиция',
      icon: '🔮',
      color: '#A855F7',
    },
    {
      key: 'harmony' as CodePurpose,
      label: 'Гармония',
      icon: '☯️',
      color: '#06B6D4',
    },
    {
      key: 'energy' as CodePurpose,
      label: 'Энергия',
      icon: '⚡',
      color: '#FBBF24',
    },
  ];

  const digitCounts = [3, 4, 5, 6, 7, 8, 9];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await chartAPI.generatePersonalCode(
        selectedPurpose,
        selectedDigitCount
      );
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка генерации кода');
      console.error('Error generating code:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedPurposeData = purposes.find((p) => p.key === selectedPurpose);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#312E81']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Safe header with back button */}
        <View style={[styles.headerSafe, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Назад</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Персональные Коды</Text>
          <Text style={styles.headerSubtitle}>
            Практичные числа силы для PIN-кодов, паролей и важных решений
          </Text>
        </View>

        {/* Purpose Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Выберите цель</Text>
          <View style={styles.purposeGrid}>
            {purposes.map((purpose) => (
              <TouchableOpacity
                key={purpose.key}
                style={[
                  styles.purposeCard,
                  selectedPurpose === purpose.key && styles.purposeCardActive,
                ]}
                onPress={() => setSelectedPurpose(purpose.key)}
              >
                <BlurView intensity={20} style={styles.purposeCardBlur}>
                  <Text style={styles.purposeIcon}>{purpose.icon}</Text>
                  <Text
                    style={[
                      styles.purposeLabel,
                      selectedPurpose === purpose.key &&
                        styles.purposeLabelActive,
                    ]}
                  >
                    {purpose.label}
                  </Text>
                </BlurView>
                {selectedPurpose === purpose.key && (
                  <View
                    style={[
                      styles.purposeActiveBorder,
                      { borderColor: purpose.color },
                    ]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Digit Count Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Количество цифр</Text>
          <View style={styles.digitCountRow}>
            {digitCounts.map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.digitButton,
                  selectedDigitCount === count && styles.digitButtonActive,
                ]}
                onPress={() => setSelectedDigitCount(count)}
              >
                <Text
                  style={[
                    styles.digitButtonText,
                    selectedDigitCount === count &&
                      styles.digitButtonTextActive,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.digitHint}>
            Больше цифр = более сложная энергетическая формула
          </Text>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            loading && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <LinearGradient
            colors={
              selectedPurposeData
                ? [selectedPurposeData.color, selectedPurposeData.color + 'CC']
                : ['#8B5CF6', '#7C3AED']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.generateButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Сгенерировать код</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <View style={styles.resultContainer}>
            {/* Code Display */}
            <BlurView intensity={30} style={styles.codeCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(124, 58, 237, 0.1)']}
                style={styles.codeCardGradient}
              >
                <View style={styles.codeHeader}>
                  <Text style={styles.codeLabel}>Ваш персональный код</Text>
                  {result.subscriptionTier !== 'free' && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.premiumBadgeText}>AI</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.codeNumber}>{result.code}</Text>

                <View style={styles.codeMetaRow}>
                  <View style={styles.codeMeta}>
                    <Text style={styles.codeMetaLabel}>Энергия</Text>
                    <View style={styles.energyBar}>
                      <View
                        style={[
                          styles.energyBarFill,
                          {
                            width: `${result.interpretation.energyLevel}%`,
                            backgroundColor:
                              selectedPurposeData?.color || '#8B5CF6',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.codeMetaValue}>
                      {result.interpretation.energyLevel}%
                    </Text>
                  </View>

                  <View style={styles.codeMeta}>
                    <Text style={styles.codeMetaLabel}>Вибрация</Text>
                    <Text style={styles.codeMetaValue}>
                      {result.interpretation.vibration}
                    </Text>
                  </View>
                </View>

                <View style={styles.numerologyCard}>
                  <Text style={styles.numerologyLabel}>Нумерология</Text>
                  <View style={styles.numerologyRow}>
                    <View style={styles.numerologyItem}>
                      <Text style={styles.numerologyNumber}>
                        {result.numerology.reducedNumber}
                      </Text>
                      <Text style={styles.numerologyText}>Итоговое число</Text>
                    </View>
                    {result.numerology.masterNumber && (
                      <View style={styles.numerologyItem}>
                        <Text
                          style={[styles.numerologyNumber, styles.masterNumber]}
                        >
                          {result.numerology.masterNumber}
                        </Text>
                        <Text style={styles.numerologyText}>Мастер-число</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.numerologyMeaning}>
                    {result.numerology.meaning}
                  </Text>
                </View>
              </LinearGradient>
            </BlurView>

            {/* Interpretation */}
            <View style={styles.interpretationSection}>
              <Text style={styles.interpretationTitle}>Интерпретация</Text>

              <BlurView intensity={20} style={styles.interpretationCard}>
                <Text style={styles.interpretationSummary}>
                  {result.interpretation.summary}
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.interpretationCard}>
                <Text style={styles.interpretationText}>
                  {result.interpretation.detailed}
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.interpretationCard}>
                <Text style={styles.interpretationCompatibility}>
                  {result.interpretation.compatibility}
                </Text>
              </BlurView>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>Расшифровка кода</Text>
              {result.breakdown.map((item, index) => (
                <BlurView
                  key={index}
                  intensity={20}
                  style={styles.breakdownCard}
                >
                  <View style={styles.breakdownHeader}>
                    <View style={styles.digitCircle}>
                      <Text style={styles.digitCircleText}>{item.digit}</Text>
                    </View>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownSource}>{item.source}</Text>
                      <Text style={styles.breakdownInfluence}>
                        {item.influence}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownMeaning}>
                    {item.astrologyMeaning}
                  </Text>
                  <Text style={styles.breakdownNumerology}>
                    Нумерология: {item.numerologyMeaning}
                  </Text>
                </BlurView>
              ))}
            </View>

            {/* Practical Examples */}
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle}>Где использовать</Text>

              <BlurView intensity={20} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons name="card-outline" size={24} color="#10B981" />
                  <Text style={styles.exampleTitle}>4 цифры</Text>
                </View>
                <Text style={styles.exampleText}>
                  • PIN банковской карты для привлечения денег{'\n'}• Код
                  домофона для безопасности дома{'\n'}• Время важных встреч
                  (15:37)
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={24}
                    color="#8B5CF6"
                  />
                  <Text style={styles.exampleTitle}>6 цифр</Text>
                </View>
                <Text style={styles.exampleText}>
                  • Пароль банковского приложения{'\n'}• WiFi пароль дома для
                  удачи семьи{'\n'}• Пароль важных аккаунтов
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons name="call-outline" size={24} color="#F59E0B" />
                  <Text style={styles.exampleTitle}>7+ цифр</Text>
                </View>
                <Text style={styles.exampleText}>
                  • Последние цифры номера телефона{'\n'}• Целевая зарплата (код
                  × 1000 руб){'\n'}• Номер лотерейного билета
                </Text>
              </BlurView>
            </View>

            {/* How to Use */}
            <View style={styles.usageSection}>
              <Text style={styles.sectionTitle}>Детальные инструкции</Text>

              <BlurView intensity={20} style={styles.usageCard}>
                <View style={styles.usageItem}>
                  <Ionicons name="time-outline" size={20} color="#A78BFA" />
                  <Text style={styles.usageLabel}>Когда использовать</Text>
                </View>
                <Text style={styles.usageText}>
                  {result.interpretation.whenToUse}
                </Text>
              </BlurView>

              {result.interpretation.howToUse.map((instruction, index) => (
                <BlurView key={index} intensity={20} style={styles.usageCard}>
                  <View style={styles.usageItem}>
                    <View style={styles.usageNumber}>
                      <Text style={styles.usageNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.usageText}>{instruction}</Text>
                  </View>
                </BlurView>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#A78BFA',
  },
  headerSafe: {
    paddingHorizontal: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  purposeCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  purposeCardBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  purposeCardActive: {
    transform: [{ scale: 0.98 }],
  },
  purposeActiveBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 16,
  },
  purposeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  purposeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  purposeLabelActive: {
    color: '#FFFFFF',
  },
  digitCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  digitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  digitButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  digitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  digitButtonTextActive: {
    color: '#FFFFFF',
  },
  digitHint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  generateButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  resultContainer: {
    gap: 24,
  },
  codeCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  codeCardGradient: {
    padding: 24,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  codeNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
  },
  codeMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  codeMeta: {
    flex: 1,
  },
  codeMetaLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  codeMetaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  energyBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginVertical: 6,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  numerologyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  numerologyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 12,
  },
  numerologyRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  numerologyItem: {
    flex: 1,
    alignItems: 'center',
  },
  numerologyNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  masterNumber: {
    color: '#F59E0B',
  },
  numerologyText: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  numerologyMeaning: {
    fontSize: 13,
    color: '#CBD5E0',
    textAlign: 'center',
  },
  interpretationSection: {
    gap: 12,
  },
  interpretationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  interpretationCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  interpretationSummary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  interpretationText: {
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 22,
  },
  interpretationCompatibility: {
    fontSize: 14,
    color: '#A78BFA',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  breakdownSection: {
    gap: 12,
  },
  breakdownCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  digitCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitCircleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownSource: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  breakdownInfluence: {
    fontSize: 12,
    color: '#A78BFA',
  },
  breakdownMeaning: {
    fontSize: 13,
    color: '#CBD5E0',
    lineHeight: 20,
    marginBottom: 8,
  },
  breakdownNumerology: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  usageSection: {
    gap: 12,
  },
  examplesSection: {
    gap: 12,
    marginBottom: 24,
  },
  exampleCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exampleText: {
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 22,
  },
  usageCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 8,
  },
  usageNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usageText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 20,
  },
});

export default PersonalCodeScreen;
