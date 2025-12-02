import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import { useSubscription } from '../hooks/useSubscription';
import { advisorAPI } from '../services/api';
import AdvisorAspectsWidget from '../components/advisor/AdvisorAspectsWidget';
import AdvisorRecommendationsWidget from '../components/advisor/AdvisorRecommendationsWidget';
import AdvisorResultWidget from 'src/components/advisor/AdvisorResultWidget';
import BestWindowsWidget from 'src/components/advisor/BestWindowsWidget';
import { logger } from '../services/logger';

type Topic =
  | 'contract'
  | 'meeting'
  | 'date'
  | 'travel'
  | 'purchase'
  | 'health'
  | 'negotiation'
  | 'custom';

interface TopicOption {
  key: Topic;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  description: string;
}

const TOPIC_CONFIG: Array<{
  key: Topic;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
}> = [
  { key: 'contract', icon: 'document-text', gradient: ['#8B5CF6', '#6366F1'] },
  { key: 'meeting', icon: 'people', gradient: ['#EC4899', '#F43F5E'] },
  { key: 'negotiation', icon: 'chatbubbles', gradient: ['#F59E0B', '#EAB308'] },
  { key: 'date', icon: 'heart', gradient: ['#EC4899', '#EF4444'] },
  { key: 'travel', icon: 'airplane', gradient: ['#3B82F6', '#06B6D4'] },
  { key: 'purchase', icon: 'cart', gradient: ['#10B981', '#14B8A6'] },
  { key: 'health', icon: 'fitness', gradient: ['#EF4444', '#F97316'] },
  { key: 'custom', icon: 'ellipsis-horizontal', gradient: ['#6366F1', '#8B5CF6'] },
];

const AdvisorScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { isPremium } = useSubscription();
  const premium = useMemo(() => isPremium(), [isPremium]);

  // State
  const [selectedTopic, setSelectedTopic] = useState<Topic>('contract');
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const topics: TopicOption[] = useMemo(
    () =>
      TOPIC_CONFIG.map((config) => ({
        ...config,
        label: t(`advisor.topics.${config.key}.label`),
        description: t(`advisor.topics.${config.key}.description`),
      })),
    [t]
  );

  const selectedTopicOption = topics.find((t) => t.key === selectedTopic)!;

  const submit = async () => {
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        topic: selectedTopic,
        date,
        timezone,
        customNote: customNote || undefined,
      };
      const data = await advisorAPI.evaluate(payload);
      setResult(data);
    } catch (e: any) {
      setResult({
        verdict: 'challenging',
        color: '#EF4444',
        score: 0,
        factors: [],
        aspects: [],
        bestWindows: [],
        recommendations: [],
        explanation:
          e?.response?.data?.message || t('advisor.errors.requestFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Premium gate
  if (!premium) {
    return (
      <View style={styles.premiumGate}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.2)', 'rgba(99, 102, 241, 0.1)']}
          style={styles.premiumGradient}
        >
          <Ionicons name="lock-closed" size={72} color="#8B5CF6" />
          <Text style={styles.premiumTitle}>{t('advisor.premium.title')}</Text>
          <Text style={styles.premiumSubtitle}>
            {t('advisor.premium.subtitle')}
          </Text>
          <View style={styles.premiumFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {t('advisor.premium.features.hourlyAnalysis')}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {t('advisor.premium.features.aspectInterpretations')}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>
                {t('advisor.premium.features.recommendations')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              try {
                navigation.navigate('Subscription' as never);
              } catch (e: any) {
                logger.error('navigation failed', e?.message || e);
              }
            }}
            style={styles.premiumButton}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumButtonGradient}
            >
              <Text style={styles.premiumButtonText}>{t('advisor.premium.getPremium')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <TabScreenLayout>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
            <View style={styles.headerIconContainer}>
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                style={styles.headerIcon}
              >
                <Ionicons name="bulb" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>{t('advisor.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('advisor.subtitle')}</Text>
            <Text style={styles.headerDate}>
              {t('advisor.analysisFor')}{' '}
              {new Date(date).toLocaleDateString(
                i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'es' ? 'es-ES' : 'en-US',
                { day: 'numeric', month: 'long', year: 'numeric' }
              )}
            </Text>
          </BlurView>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Topic Selection */}
            <BlurView intensity={10} tint="dark" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="grid" size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>{t('advisor.selectTopic')}</Text>
              </View>

              <View style={styles.topicGrid}>
                {topics.map((topic) => {
                  const isActive = topic.key === selectedTopic;
                  return (
                    <TouchableOpacity
                      key={topic.key}
                      onPress={() => setSelectedTopic(topic.key)}
                      style={[
                        styles.topicCard,
                        isActive && styles.topicCardActive,
                      ]}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={topic.gradient}
                          style={styles.topicCardGradient}
                        >
                          <Ionicons
                            name={topic.icon}
                            size={24}
                            color="#FFFFFF"
                          />
                          <Text style={styles.topicLabel}>{topic.label}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.topicCardInactive}>
                          <Ionicons
                            name={topic.icon}
                            size={24}
                            color="rgba(255,255,255,0.6)"
                          />
                          <Text style={styles.topicLabelInactive}>
                            {topic.label}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Topic Description */}
              <View style={styles.topicDescription}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color="rgba(139, 92, 246, 0.8)"
                />
                <Text style={styles.topicDescriptionText}>
                  {selectedTopicOption.description}
                </Text>
              </View>
            </BlurView>

            {/* Date Input */}
            <BlurView intensity={10} tint="dark" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>{t('advisor.dateAnalysis')}</Text>
              </View>

              <View style={styles.dateInputContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={styles.dateInput}
                />
              </View>

              {/* Quick Date Buttons */}
              <View style={styles.quickDateButtons}>
                <TouchableOpacity
                  onPress={() => setDate(new Date().toISOString().slice(0, 10))}
                  style={styles.quickDateButton}
                >
                  <Text style={styles.quickDateButtonText}>{t('advisor.quickDates.today')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setDate(tomorrow.toISOString().slice(0, 10));
                  }}
                  style={styles.quickDateButton}
                >
                  <Text style={styles.quickDateButtonText}>{t('advisor.quickDates.tomorrow')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setDate(nextWeek.toISOString().slice(0, 10));
                  }}
                  style={styles.quickDateButton}
                >
                  <Text style={styles.quickDateButtonText}>{t('advisor.quickDates.nextWeek')}</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            {/* Custom Note (Optional) */}
            <BlurView intensity={10} tint="dark" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="text" size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>
                  {t('advisor.context')}{' '}
                  <Text style={styles.optionalLabel}>{t('advisor.optional')}</Text>
                </Text>
              </View>

              <TextInput
                value={customNote}
                onChangeText={setCustomNote}
                placeholder={t('advisor.contextPlaceholder')}
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.customNoteInput}
                multiline
                numberOfLines={3}
              />
            </BlurView>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              style={styles.submitButtonContainer}
            >
              <LinearGradient
                colors={
                  loading
                    ? ['rgba(139,92,246,0.5)', 'rgba(99,102,241,0.5)']
                    : ['#8B5CF6', '#6366F1']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.submitButtonText}>{t('advisor.submit.analyzing')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>{t('advisor.submit.analyze')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Results */}
            {result && (
              <View style={styles.resultsContainer}>
                {/* Main Result Widget */}
                <AdvisorResultWidget
                  verdict={result.verdict}
                  score={result.score}
                  color={result.color}
                  explanation={result.explanation}
                  topic={selectedTopicOption.label}
                  topicIcon={selectedTopicOption.icon}
                />

                {/* Recommendations Widget */}
                {result.recommendations?.length > 0 && (
                  <AdvisorRecommendationsWidget
                    recommendations={result.recommendations}
                    verdict={result.verdict}
                  />
                )}

                {/* Best Time Windows Widget */}
                {result.bestWindows?.length > 0 && (
                  <BestWindowsWidget
                    windows={result.bestWindows}
                    verdict={result.verdict}
                  />
                )}

                {/* Aspects Widget */}
                {result.aspects?.length > 0 && (
                  <AdvisorAspectsWidget
                    aspects={result.aspects}
                    factors={result.factors}
                  />
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </TabScreenLayout>
    </>
  );
};

const styles = StyleSheet.create({
  // Premium Gate
  premiumGate: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  premiumGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  premiumTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  premiumSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  premiumFeatures: {
    marginTop: 32,
    gap: 16,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
  },
  premiumButton: {
    marginTop: 32,
    width: '100%',
  },
  premiumButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Main Layout
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    textAlign: 'center',
  },

  // Content
  contentContainer: {
    marginTop: 20,
    gap: 16,
    paddingHorizontal: 8,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },

  // Topic Selection
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  topicCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  topicCardActive: {
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  topicCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topicCardInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  topicLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  topicLabelInactive: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  topicDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  topicDescriptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    flex: 1,
  },

  // Date Input
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickDateButton: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  quickDateButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },

  // Custom Note
  customNoteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: 15,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Submit Button
  submitButtonContainer: {
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Results
  resultsContainer: {
    gap: 16,
    marginTop: 8,
  },
});

export default AdvisorScreen;
